import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from './auth.controller';
import { validate } from '../../middleware/validate';
import { registerSchema, loginSchema, refreshSchema } from './auth.validation';
import { requireAuth } from '../../middleware/auth';
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

export default router;
