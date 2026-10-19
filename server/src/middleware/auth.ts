import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken, validateAccessSession } from '../modules/auth/auth.service';
import { assertGuardianPortalAccess } from '../modules/guardians/guardians.access';
import { Role } from '../types/roles';

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/** Requires a valid, non-expired access token before a request can reach protected data. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    next(ApiError.unauthorized('Missing or malformed Authorization header'));
    return;
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    await validateAccessSession(payload);
    await assertGuardianPortalAccess(payload.sub, payload.role);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(ApiError.unauthorized('Invalid or expired access token'));
  }
}

/** Role-based access control for protected routes.
 * Usage: router.post('/x', requireAuth, requireRole('Administrator','Principal'), handler) */
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!allowed.includes(req.user.role)) {
      next(ApiError.forbidden(`This action requires one of: ${allowed.join(', ')}`));
      return;
    }
    next();
  };
}
