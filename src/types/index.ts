export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

export interface StockDetail extends StockQuote {
  marketCap: number;
  peRatio: number | null;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  volume: number;
  avgVolume: number;
}

export interface AnalysisResult {
  bullCase: string;
  bearCase: string;
  verdict: string;
}

export interface AnalysisResponse extends AnalysisResult {
  id: string;
  ticker: string;
  createdAt: string;
  updatedAt: string;
  isCached: boolean;
}

export type SSEEventType = 'token' | 'complete' | 'error' | 'cached';

export interface SSEEvent {
  type: SSEEventType;
  data: string | AnalysisResponse | { message: string };
}

export interface StockEntry {
  ticker: string;
  name: string;
  sector: string;
}

export { AppError } from '../utils/errors';
