import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import type { StockQuote, StockDetail } from '../types/index';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const yahooFinanceService = {
  async search(query: string): Promise<string[]> {
    try {
      const result = await yahooFinance.search(query, { region: 'IN', lang: 'en-IN' });
      if (!result || !result.quotes) return [];

      const symbols: string[] = [];
      for (const q of result.quotes) {
        const symbol = q.symbol;
        if (typeof symbol === 'string' && symbol) {
          const upper = symbol.toUpperCase();
          if (upper.endsWith('.NS')) {
            symbols.push(upper);
          } else if (upper.endsWith('.BO')) {
            symbols.push(upper.slice(0, -3) + '.NS');
          }
        }
      }

      return Array.from(new Set(symbols));
    } catch (error) {
      logger.error('Yahoo Finance search error', { query, error });
      return [];
    }
  },

  async getQuotes(tickers: string[]): Promise<StockQuote[]> {
    try {
      const results = await Promise.allSettled(tickers.map((ticker) => yahooFinance.quote(ticker)));

      const quotes: StockQuote[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i]!;
        const ticker = tickers[i]!;

        if (result.status === 'fulfilled' && result.value) {
          const q = result.value as Record<string, unknown>;
          quotes.push({
            ticker,
            name:
              (q['shortName'] as string) ?? (q['longName'] as string) ?? ticker.replace('.NS', ''),
            price: (q['regularMarketPrice'] as number) ?? 0,
            change: (q['regularMarketChange'] as number) ?? 0,
            changePercent: (q['regularMarketChangePercent'] as number) ?? 0,
            currency: (q['currency'] as string) ?? 'INR',
          });
        } else {
          logger.warn(`Failed to fetch quote for ${ticker}`, {
            error: result.status === 'rejected' ? result.reason : 'No data',
          });
        }
      }

      return quotes;
    } catch (error) {
      logger.error('Yahoo Finance batch quote error', { error });
      throw new AppError('Failed to fetch stock prices', 502);
    }
  },

  async getStockDetail(ticker: string): Promise<StockDetail> {
    try {
      const quote = await yahooFinance.quote(ticker);
      let summary: Record<string, unknown> | null = null;

      try {
        const summaryResult = await yahooFinance.quoteSummary(ticker, {
          modules: ['summaryDetail', 'defaultKeyStatistics'],
        });
        summary = summaryResult as unknown as Record<string, unknown>;
      } catch {
        logger.warn('quoteSummary failed, using quote data only', { ticker });
      }

      if (!quote) {
        throw new AppError(`Stock ${ticker} not found`, 404);
      }

      const q = quote as Record<string, unknown>;
      const summaryDetail = (summary?.['summaryDetail'] ?? {}) as Record<string, unknown>;

      return {
        ticker,
        name: (q['shortName'] as string) ?? (q['longName'] as string) ?? ticker.replace('.NS', ''),
        price: (q['regularMarketPrice'] as number) ?? 0,
        change: (q['regularMarketChange'] as number) ?? 0,
        changePercent: (q['regularMarketChangePercent'] as number) ?? 0,
        currency: (q['currency'] as string) ?? 'INR',
        marketCap: (q['marketCap'] as number) ?? 0,
        peRatio: (summaryDetail['trailingPE'] as number) ?? (q['trailingPE'] as number) ?? null,
        fiftyTwoWeekHigh:
          (q['fiftyTwoWeekHigh'] as number) ?? (summaryDetail['fiftyTwoWeekHigh'] as number) ?? 0,
        fiftyTwoWeekLow:
          (q['fiftyTwoWeekLow'] as number) ?? (summaryDetail['fiftyTwoWeekLow'] as number) ?? 0,
        volume: (q['regularMarketVolume'] as number) ?? 0,
        avgVolume: (q['averageDailyVolume3Month'] as number) ?? 0,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Yahoo Finance detail error', { ticker, error });
      throw new AppError(`Failed to fetch details for ${ticker}`, 502);
    }
  },
};
