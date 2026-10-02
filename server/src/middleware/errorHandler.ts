import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/** Centralised error handler - every route funnels here via next(err) or an uncaught throw
 * inside an async wrapper. Never leak stack traces or internal messages in production. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId;

  if (err instanceof ZodError) {
    logger.warn({ requestId, issues: err.issues }, 'Validation error');
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: err.flatten(), requestId },
    });
    return;
  }

  if (err instanceof ApiError) {
    const level = err.statusCode >= 500 ? 'error' : 'warn';
    logger[level]({ requestId, code: err.code, statusCode: err.statusCode }, err.message);
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details ?? undefined, requestId },
    });
    return;
  }

  if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
    logger.warn({ requestId, code: 'DUPLICATE_KEY' }, 'Unique record already exists');
    res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'A record with this unique reference already exists', requestId },
    });
    return;
  }

  logger.error({ requestId, err }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production' ? 'Internal server error' : String(err),
      requestId,
    },
  });
}

/** Wraps an async Express handler so a rejected promise reaches errorHandler instead of
 * crashing the process or hanging the request. */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
