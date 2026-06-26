import { config } from '../config/index';
import type { StockQuote, StockDetail } from '../types/index';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        symbol?: string;
        currency?: string;
        shortName?: string;
        longName?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
        regularMarketVolume?: number;
        averageDailyVolume3Month?: number;
        marketCap?: number;
        peRatio?: number | null;
      };
    }>;
  };
}

async function fetchYahoo<T>(endpoint: string): Promise<T> {
  const baseUrl = config.YAHOO_FINANCE_API_BASE_URL.replace(/\/+$/, '');
  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance API returned ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const yahooFinanceService = {
  async search(query: string): Promise<string[]> {
    try {
      const url = `/v1/finance/search?q=${encodeURIComponent(query)}&region=IN&lang=en-IN`;
      const data = await fetchYahoo<{ quotes?: Array<{ symbol?: string }> }>(url);
      if (!data || !data.quotes) return [];

      const symbols: string[] = [];
      for (const q of data.quotes) {
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
      const results = await Promise.allSettled(
        tickers.map(async (ticker) => {
          const url = `/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
          const data = await fetchYahoo<YahooChartResponse>(url);
          const meta = data?.chart?.result?.[0]?.meta;
          if (!meta) {
            throw new Error('Invalid chart response metadata');
          }
          return { ticker, meta };
        }),
      );

      const quotes: StockQuote[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i]!;
        const ticker = tickers[i]!;

        if (result.status === 'fulfilled' && result.value) {
          const { meta } = result.value;
          const regularPrice = meta.regularMarketPrice ?? 0;
          const prevClose = meta.chartPreviousClose ?? regularPrice;
          const change = regularPrice - prevClose;
          const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

          quotes.push({
            ticker,
            name: meta.shortName ?? meta.longName ?? ticker.replace('.NS', ''),
            price: regularPrice,
            change,
            changePercent,
            currency: meta.currency ?? 'INR',
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
      const url = `/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
      const data = await fetchYahoo<YahooChartResponse>(url);
      const meta = data?.chart?.result?.[0]?.meta;

      if (!meta) {
        throw new AppError(`Stock ${ticker} not found`, 404);
      }

      const regularPrice = meta.regularMarketPrice ?? 0;
      const prevClose = meta.chartPreviousClose ?? regularPrice;
      const change = regularPrice - prevClose;
      const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

      return {
        ticker,
        name: meta.shortName ?? meta.longName ?? ticker.replace('.NS', ''),
        price: regularPrice,
        change,
        changePercent,
        currency: meta.currency ?? 'INR',
        marketCap: meta.marketCap ?? 0,
        peRatio: meta.peRatio ?? null,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? regularPrice,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? regularPrice,
        volume: meta.regularMarketVolume ?? 0,
        avgVolume: meta.averageDailyVolume3Month ?? meta.regularMarketVolume ?? 0,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Yahoo Finance detail error', { ticker, error });
      throw new AppError(`Failed to fetch details for ${ticker}`, 502);
    }
  },
};
