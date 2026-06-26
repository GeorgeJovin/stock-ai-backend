import { Router } from 'express';
import { stockRoutes } from './stock.routes';

export function createApiRouter(): Router {
  const router = Router();

  router.use('/stocks', stockRoutes);

  return router;
}
