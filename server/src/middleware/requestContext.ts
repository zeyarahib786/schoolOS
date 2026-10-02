import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/** Attaches a correlation ID to every request, echoed back as a response header, so a single
 * user-reported issue can be traced end-to-end through the structured logs. */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  req.requestId = incoming && incoming.length <= 100 ? incoming : uuidv4();
  res.setHeader('x-request-id', req.requestId);
  next();
}
