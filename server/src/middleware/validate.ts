import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

/** Validates and reassigns req.body/params/query from a Zod schema before the handler runs.
 * Throws (via next) a ZodError which errorHandler formats into a consistent 400 response -
 * this is the single input-sanitisation gate every mutating route passes through. */
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.parse({ body: req.body, params: req.params, query: req.query });
    req.body = parsed.body ?? req.body;
    next();
  };
}
