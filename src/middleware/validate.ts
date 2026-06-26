import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod/v4';
import { AppError } from '../types/index';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: z.ZodType, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      throw new AppError(
        `Validation failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`,
        400,
      );
    }

    Object.defineProperty(req, target, {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
}
