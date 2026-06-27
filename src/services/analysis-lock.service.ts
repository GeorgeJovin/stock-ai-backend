import type { AnalysisResult } from '../types/index';
import { logger } from '../utils/logger';

interface InFlightEntry {
  promise: Promise<AnalysisResult>;

  tokens: string[];

  subscribers: Array<(token: string) => void>;

  onComplete: Array<(result: AnalysisResult) => void>;

  onError: Array<(error: Error) => void>;
}

class AnalysisLockService {
  private inFlight = new Map<string, InFlightEntry>();

  isInFlight(ticker: string): boolean {
    return this.inFlight.has(ticker);
  }

  getInFlight(ticker: string): InFlightEntry | undefined {
    return this.inFlight.get(ticker);
  }

  acquire(
    ticker: string,
    generatorFn: (onToken: (token: string) => void) => Promise<AnalysisResult>,
  ): InFlightEntry {
    const entry: InFlightEntry = {
      tokens: [],
      subscribers: [],
      onComplete: [],
      onError: [],
      promise: Promise.resolve({ bullCase: '', bearCase: '', verdict: '' }),
    };

    entry.promise = generatorFn((token: string) => {
      entry.tokens.push(token);

      for (const subscriber of entry.subscribers) {
        subscriber(token);
      }
    })
      .then((result) => {
        for (const cb of entry.onComplete) {
          cb(result);
        }
        return result;
      })
      .catch((error: Error) => {
        for (const cb of entry.onError) {
          cb(error);
        }
        throw error;
      })
      .finally(() => {
        this.inFlight.delete(ticker);
        logger.debug('Analysis lock released', { ticker });
      });

    this.inFlight.set(ticker, entry);
    logger.debug('Analysis lock acquired', { ticker });

    return entry;
  }

  subscribe(
    entry: InFlightEntry,
    callbacks: {
      onToken: (token: string) => void;
      onComplete: (result: AnalysisResult) => void;
      onError: (error: Error) => void;
    },
  ): () => void {
    for (const token of entry.tokens) {
      callbacks.onToken(token);
    }

    entry.subscribers.push(callbacks.onToken);
    entry.onComplete.push(callbacks.onComplete);
    entry.onError.push(callbacks.onError);

    return () => {
      entry.subscribers = entry.subscribers.filter((cb) => cb !== callbacks.onToken);
      entry.onComplete = entry.onComplete.filter((cb) => cb !== callbacks.onComplete);
      entry.onError = entry.onError.filter((cb) => cb !== callbacks.onError);
      logger.debug('Successfully unsubscribed callbacks from in-flight entry');
    };
  }
}

export const analysisLockService = new AnalysisLockService();
