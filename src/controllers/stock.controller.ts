import type { Request, Response, NextFunction } from 'express';
import { stockService } from '../services/stock.service';
import { aiAnalysisService } from '../services/ai-analysis.service';
import type { AnalysisResponse } from '../types/index';
import { logger } from '../utils/logger';

export const stockController = {
  async searchStocks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query['q'] as string | undefined;
      const stocks = await stockService.searchStocks(query);
      res.json({ stocks });
    } catch (error) {
      next(error);
    }
  },

  async getStockDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ticker } = req.params as { ticker: string };
      const stock = await stockService.getStockDetail(ticker);
      res.json({ stock });
    } catch (error) {
      next(error);
    }
  },

  async getAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ticker } = req.params as { ticker: string };

      const stock = await stockService.getStockDetail(ticker);

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      let isClientConnected = true;
      let unsubscribe: (() => void) | undefined;

      req.on('close', () => {
        isClientConnected = false;
        if (unsubscribe) {
          unsubscribe();
        }
        logger.debug('Client disconnected from SSE', { ticker });
      });

      const sendEvent = (event: string, data: unknown): void => {
        if (!isClientConnected) return;
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      const unsub = await aiAnalysisService.getOrGenerateAnalysis(
        stock,

        (token: string) => {
          sendEvent('token', { content: token });
        },

        (result: AnalysisResponse) => {
          sendEvent('complete', result);
          if (isClientConnected) {
            res.end();
          }
        },

        (error: Error) => {
          sendEvent('error', { message: error.message });
          if (isClientConnected) {
            res.end();
          }
        },
      );

      if (unsub) {
        if (!isClientConnected) {
          unsub();
        } else {
          unsubscribe = unsub;
        }
      }
    } catch (error) {
      if (!res.headersSent) {
        next(error);
      } else {
        try {
          res.write(`event: error\ndata: ${JSON.stringify({ message: 'Analysis failed' })}\n\n`);
          res.end();
        } catch (writeError) {
          logger.error('Failed to write SSE error event', { error: writeError });
        }
      }
    }
  },
};
