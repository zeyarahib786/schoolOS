import { Response } from 'express';

/**
 * Every successful response in this API follows the same envelope, so the frontend's
 * API client can unwrap `data` generically instead of each endpoint having a bespoke shape.
 */
export function sendSuccess<T>(res: Response, statusCode: number, data: T, meta?: Record<string, unknown>): Response {
  return res.status(statusCode).json({ success: true, data, meta: meta ?? null });
}
