import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { config } from '../config/index';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const isOperational = err instanceof AppError ? err.isOperational : false;

  if (statusCode >= 500) {
    logger.error('Unhandled server error', {
      message: err.message,
      stack: err.stack,
      statusCode,
    });
  } else {
    logger.warn('Client error', {
      message: err.message,
      statusCode,
    });
  }

  const response: Record<string, unknown> = {
    status: 'error',
    statusCode,
    message: isOperational || statusCode < 500 ? err.message : 'Internal server error',
  };

  if (config.NODE_ENV === 'development') {
    response['stack'] = err.stack;
  }

  res.status(statusCode).json(response);
}
