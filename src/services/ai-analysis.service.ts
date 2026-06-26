import OpenAI from 'openai';
import { config } from '../config/index';
import { analysisRepository } from '../repositories/analysis.repository';
import { analysisLockService } from './analysis-lock.service';
import { AppError } from '../utils/errors';
import type { StockDetail, AnalysisResult, AnalysisResponse } from '../types/index';
import { logger } from '../utils/logger';

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  baseURL: config.OPENAI_BASE_URL,
});

const SYSTEM_PROMPT = `You are a senior financial analyst specializing in Indian equity markets.
Given stock data, provide a concise but insightful analysis in EXACTLY this JSON format:

{
  "bull_case": "A concise paragraph (exactly 2-3 sentences) explaining the positive outlook. Do not include any bullet points or lists.",
  "bear_case": "A concise paragraph (exactly 2-3 sentences) explaining the risks/concerns. Do not include any bullet points or lists.",
  "verdict": "A concise paragraph (exactly 2-3 sentences) summarizing the final investment stance (accumulate, hold, reduce). Do not include any bullet points or lists."
}

Be specific and data-driven. Reference the provided metrics. Do not use generic statements.
Respond ONLY with valid JSON. No markdown, no code fences, no additional text.`;

function buildUserPrompt(stock: StockDetail): string {
  return `Analyze this Indian stock:

Company: ${stock.name}
Ticker: ${stock.ticker}
Current Price: ₹${stock.price.toLocaleString('en-IN')}
Daily Change: ${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)} (${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%)
Market Cap: ₹${(stock.marketCap / 10_000_000).toFixed(0)} Cr
P/E Ratio: ${stock.peRatio?.toFixed(2) ?? 'N/A'}
52-Week High: ₹${stock.fiftyTwoWeekHigh.toLocaleString('en-IN')}
52-Week Low: ₹${stock.fiftyTwoWeekLow.toLocaleString('en-IN')}
Volume: ${stock.volume.toLocaleString('en-IN')}
Avg Volume: ${stock.avgVolume.toLocaleString('en-IN')}`;
}

async function generateAnalysis(
  stock: StockDetail,
  onToken: (token: string) => void,
): Promise<AnalysisResult> {
  const stream = await openai.chat.completions.create({
    model: config.OPENAI_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(stock) },
    ],
    response_format: { type: 'json_object' },
    stream: true,
    temperature: 0.7,
    max_tokens: 2000,
  });

  let fullContent = '';

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullContent += content;
      onToken(content);
    }
  }

  try {
    const parsed = JSON.parse(fullContent) as {
      bull_case?: string;
      bear_case?: string;
      verdict?: string;
    };

    return {
      bullCase: parsed.bull_case ?? '',
      bearCase: parsed.bear_case ?? '',
      verdict: parsed.verdict ?? '',
    };
  } catch {
    logger.error('Failed to parse AI response', { content: fullContent });
    throw new AppError('AI generated an invalid response', 500);
  }
}

export const aiAnalysisService = {
  async getOrGenerateAnalysis(
    stock: StockDetail,
    onToken: (token: string) => void,
    onComplete: (result: AnalysisResponse) => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    const { ticker } = stock;

    const cached = await analysisRepository.findValidByTicker(ticker, config.ANALYSIS_CACHE_HOURS);

    if (cached) {
      logger.info('Cache hit for analysis', { ticker });
      onComplete({
        id: cached.id,
        ticker: cached.ticker,
        bullCase: cached.bullCase,
        bearCase: cached.bearCase,
        verdict: cached.verdict,
        createdAt: cached.createdAt.toISOString(),
        updatedAt: cached.updatedAt.toISOString(),
        isCached: true,
      });
      return;
    }

    const inFlight = analysisLockService.getInFlight(ticker);
    if (inFlight) {
      logger.info('Subscribing to in-flight analysis', { ticker });
      analysisLockService.subscribe(inFlight, {
        onToken,
        onComplete: async (result) => {
          const saved = await analysisRepository.findByTicker(ticker);
          onComplete({
            ...result,
            id: saved?.id ?? '',
            ticker,
            createdAt: saved?.createdAt.toISOString() ?? new Date().toISOString(),
            updatedAt: saved?.updatedAt.toISOString() ?? new Date().toISOString(),
            isCached: false,
          });
        },
        onError,
      });
      return;
    }

    logger.info('Generating new analysis', { ticker });

    analysisLockService.acquire(ticker, async (lockOnToken) => {
      const result = await generateAnalysis(stock, (token) => {
        lockOnToken(token);
        onToken(token);
      });

      const saved = await analysisRepository.upsert(ticker, result);

      onComplete({
        ...result,
        id: saved.id,
        ticker,
        createdAt: saved.createdAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString(),
        isCached: false,
      });

      return result;
    });
  },
};
