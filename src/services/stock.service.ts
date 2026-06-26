import { SUPPORTED_STOCKS, isValidTicker } from '../config/stocks';
import { yahooFinanceService } from './yahoo-finance.service';
import { AppError } from '../types/index';
import type { StockQuote, StockDetail } from '../types/index';

export const stockService = {
  async searchStocks(query?: string): Promise<StockQuote[]> {
    let tickers: string[];

    if (query && query.trim().length > 0) {
      const q = query.trim().toLowerCase();
      const localMatches = SUPPORTED_STOCKS.filter(
        (stock) =>
          stock.name.toLowerCase().includes(q) ||
          stock.ticker.toLowerCase().includes(q) ||
          stock.sector.toLowerCase().includes(q),
      ).map((s) => s.ticker);

      const liveMatches = await yahooFinanceService.search(query.trim());
      tickers = Array.from(new Set([...localMatches, ...liveMatches])).slice(0, 15);
    } else {
      tickers = SUPPORTED_STOCKS.map((s) => s.ticker);
    }

    if (tickers.length === 0) {
      return [];
    }

    const quotes = await yahooFinanceService.getQuotes(tickers);

    return quotes.map((quote) => {
      const entry = SUPPORTED_STOCKS.find((s) => s.ticker === quote.ticker);
      return {
        ...quote,
        name: entry?.name ?? quote.name,
      };
    });
  },

  async getStockDetail(ticker: string): Promise<StockDetail> {
    const upperTicker = ticker.toUpperCase();

    if (!isValidTicker(upperTicker)) {
      throw new AppError(
        `Ticker ${upperTicker} is not supported. Use /api/stocks to see available stocks.`,
        400,
      );
    }

    const detail = await yahooFinanceService.getStockDetail(upperTicker);

    const entry = SUPPORTED_STOCKS.find((s) => s.ticker === upperTicker);
    if (entry) {
      detail.name = entry.name;
    }

    return detail;
  },
};
