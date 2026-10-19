import { RequestHandler } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';

/** Fixture registration is available only when the server explicitly runs in test mode.
 * Real deployments bootstrap through the seed command, then administrators create accounts. */
export function registrationAccess(allowTestFixtures: boolean): RequestHandler {
  const administratorOnly = requireRole('Administrator');
  return (req, res, next) => {
    if (allowTestFixtures) {
      next();
      return;
    }
    requireAuth(req, res, (error?: unknown) => {
      if (error) {
        next(error);
        return;
      }
      administratorOnly(req, res, next);
    });
  };
}
