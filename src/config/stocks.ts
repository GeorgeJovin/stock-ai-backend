import type { StockEntry } from '../types/index';

export const SUPPORTED_STOCKS: readonly StockEntry[] = [
  { ticker: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Energy' },
  { ticker: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT' },
  { ticker: 'INFY.NS', name: 'Infosys', sector: 'IT' },
  { ticker: 'HDFCBANK.NS', name: 'HDFC Bank', sector: 'Banking' },
  { ticker: 'ICICIBANK.NS', name: 'ICICI Bank', sector: 'Banking' },
  { ticker: 'WIPRO.NS', name: 'Wipro', sector: 'IT' },
  { ticker: 'BAJFINANCE.NS', name: 'Bajaj Finance', sector: 'Finance' },
  { ticker: 'HINDUNILVR.NS', name: 'Hindustan Unilever', sector: 'FMCG' },
  { ticker: 'MARUTI.NS', name: 'Maruti Suzuki', sector: 'Automobile' },
  { ticker: 'TMCV.NS', name: 'Tata Motors', sector: 'Automobile' },
  { ticker: 'SBIN.NS', name: 'State Bank of India', sector: 'Banking' },
  { ticker: 'ADANIENT.NS', name: 'Adani Enterprises', sector: 'Conglomerate' },
  { ticker: 'AXISBANK.NS', name: 'Axis Bank', sector: 'Banking' },
  { ticker: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical', sector: 'Pharma' },
  { ticker: 'ONGC.NS', name: 'Oil and Natural Gas Corp', sector: 'Energy' },
] as const;

export const VALID_TICKERS = new Set(SUPPORTED_STOCKS.map((s) => s.ticker));

export function isValidTicker(ticker: string): boolean {
  const upper = ticker.toUpperCase();
  return VALID_TICKERS.has(upper) || (upper.endsWith('.NS') && /^[A-Z0-9&._-]+$/.test(upper));
}
