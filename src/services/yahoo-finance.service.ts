import YahooFinance from 'yahoo-finance2';
import type { StockQuote, StockDetail } from '../types/index';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { MemoryCache } from '../utils/cache';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const searchCache = new MemoryCache<string[]>();
const quoteCache = new MemoryCache<StockQuote>();
const detailCache = new MemoryCache<StockDetail>();

export const yahooFinanceService = {
  async search(query: string): Promise<string[]> {
    const cacheKey = query.trim().toLowerCase();
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    try {
      const results = await yahooFinance.search(query);
      const symbols = (results.quotes || [])
        .map((q) => q.symbol)
        .filter((symbol): symbol is string => typeof symbol === 'string' && !!symbol)
        .map((symbol) => {
          const upper = symbol.toUpperCase();
          return upper.endsWith('.BO') ? upper.slice(0, -3) + '.NS' : upper;
        })
        .filter((symbol) => symbol.endsWith('.NS'));

      const uniqueSymbols = Array.from(new Set(symbols));
      searchCache.set(cacheKey, uniqueSymbols, 300_000); // 5 mins cache
      return uniqueSymbols;
    } catch (error) {
      logger.error('Yahoo Finance search error', { query, error });
      return [];
    }
  },

  async getQuotes(tickers: string[]): Promise<StockQuote[]> {
    try {
      const cachedQuotes: StockQuote[] = [];
      const missingTickers: string[] = [];

      for (const ticker of tickers) {
        const cached = quoteCache.get(ticker);
        if (cached) {
          cachedQuotes.push(cached);
        } else {
          missingTickers.push(ticker);
        }
      }

      if (missingTickers.length > 0) {
        try {
          const results = await yahooFinance.quote(missingTickers);
          const quotesArray = Array.isArray(results) ? results : [results];

          for (const q of quotesArray) {
            if (!q) continue;
            const quote: StockQuote = {
              ticker: q.symbol,
              name: q.shortName ?? q.longName ?? q.symbol.replace('.NS', ''),
              price: q.regularMarketPrice ?? 0,
              change: q.regularMarketChange ?? 0,
              changePercent: q.regularMarketChangePercent ?? 0,
              currency: q.currency ?? 'INR',
            };
            quoteCache.set(q.symbol, quote, 60_000);
            cachedQuotes.push(quote);
          }
        } catch (err) {
          logger.error('Failed to fetch quotes using yahoo-finance2 library', { error: err });
          throw err;
        }
      }

      return tickers
        .map((ticker) => cachedQuotes.find((q) => q.ticker === ticker))
        .filter((q): q is StockQuote => !!q);
    } catch (error) {
      logger.error('Yahoo Finance batch quote error', { error });
      throw new AppError('Failed to fetch stock prices', 502);
    }
  },

  async getStockDetail(ticker: string): Promise<StockDetail> {
    const cached = detailCache.get(ticker);
    if (cached) return cached;

    try {
      const q = await yahooFinance.quote(ticker);
      if (!q) throw new Error('No quote returned in result');

      const price = q.regularMarketPrice ?? 0;
      const detail: StockDetail = {
        ticker: q.symbol,
        name: q.shortName ?? q.longName ?? q.symbol.replace('.NS', ''),
        price,
        change: q.regularMarketChange ?? 0,
        changePercent: q.regularMarketChangePercent ?? 0,
        currency: q.currency ?? 'INR',
        marketCap: q.marketCap ?? 0,
        peRatio: q.trailingPE ?? q.forwardPE ?? null,
        fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? price,
        fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? price,
        volume: q.regularMarketVolume ?? 0,
        avgVolume: q.averageDailyVolume3Month ?? q.regularMarketVolume ?? 0,
      };

      detailCache.set(ticker, detail, 60_000);
      return detail;
    } catch (error) {
      logger.error('Yahoo Finance detail error in library', { ticker, error });
      throw new AppError(`Failed to fetch details for ${ticker}`, 502);
    }
  },
};
