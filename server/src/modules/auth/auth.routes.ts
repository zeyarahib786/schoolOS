import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from './auth.controller';
import { validate } from '../../middleware/validate';
import { registerSchema, loginSchema, refreshSchema } from './auth.validation';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import * as accounts from './auth.accounts';
import {
  provisionSchema,
  resetAccountSchema,
  changePasswordSchema,
  directorySchema,
  correctAccountSchema,
} from './auth.validation';
import { requireAuth, requireRole } from '../../middleware/auth';
import { registrationAccess } from './registration-access';
import { env } from '../../config/env';

const router = Router();

/** Tighter rate limit specifically on auth endpoints - brute-force / credential-stuffing
 * protection beyond the app-wide limiter applied in app.ts. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skip: () => env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts - try again later' } },
});

router.post(
  '/register',
  authLimiter,
  registrationAccess(env.NODE_ENV === 'test'),
  validate(registerSchema),
  controller.register,
);
router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/refresh', authLimiter, validate(refreshSchema), controller.refresh);
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.me);

router.get(
  '/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    sendSuccess(res, 200, await accounts.ownProfile(req.user!));
  }),
);
router.post(
  '/password',
  requireAuth,
  authLimiter,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      200,
      await accounts.changeOwnPassword(req.user!.id, req.body.currentPassword, req.body.newPassword),
    );
  }),
);
router.get(
  '/accounts/directory',
  requireAuth,
  requireRole('Administrator'),
  validate(directorySchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, 200, await accounts.accountDirectory(String(req.query.q || ''), String(req.query.grade || '')));
  }),
);
router.post(
  '/accounts',
  requireAuth,
  requireRole('Administrator'),
  validate(provisionSchema),
  asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    sendSuccess(res, 201, await accounts.provisionAccount(req.body, req.user!.id));
  }),
);
router.post(
  '/accounts/:id/reset',
  requireAuth,
  requireRole('Administrator'),
  authLimiter,
  validate(resetAccountSchema),
  asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    sendSuccess(res, 200, await accounts.resetAccount(req.params.id, req.user!.id));
  }),
);
router.get(
  '/accounts/:id',
  requireAuth,
  requireRole('Administrator'),
  validate(resetAccountSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, 200, await accounts.managedAccount(req.params.id));
  }),
);
router.patch(
  '/accounts/:id',
  requireAuth,
  requireRole('Administrator'),
  validate(correctAccountSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, 200, await accounts.correctAccount(req.params.id, req.body, req.user!.id));
  }),
);
export default router;
