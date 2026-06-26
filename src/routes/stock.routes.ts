import { Router } from 'express';
import { stockController } from '../controllers/stock.controller';
import { validate } from '../middleware/validate';
import { analysisLimiter } from '../middleware/rate-limiter';
import { z } from 'zod/v4';

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().max(100).optional(),
});

const tickerParamSchema = z.object({
  ticker: z
    .string()
    .min(1)
    .max(20)
    .transform((val) => val.toUpperCase()),
});

router.get('/', validate(searchQuerySchema, 'query'), stockController.searchStocks);

router.get('/:ticker', validate(tickerParamSchema, 'params'), stockController.getStockDetail);

router.get(
  '/:ticker/analysis',
  analysisLimiter,
  validate(tickerParamSchema, 'params'),
  stockController.getAnalysis,
);

export { router as stockRoutes };
