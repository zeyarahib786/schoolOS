import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { notificationStatus } from './notifications.config';
import { queueNotificationSchema, deliveryIdSchema } from './notifications.validation';
import * as service from './notifications.service';
const router = Router();
router.use(requireAuth, requireRole('Administrator', 'Principal', 'Teacher'));
router.get(
  '/status',
  asyncHandler(async (_req, res) => {
    sendSuccess(res, 200, notificationStatus());
  }),
);
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const r = await service.listDeliveries(req.query, req.user!);
    sendSuccess(res, 200, r.items, { pagination: r.pagination });
  }),
);
router.post(
  '/',
  validate(queueNotificationSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, 201, await service.queueNotification(req.body, req.user!));
  }),
);
router.post(
  '/:id/approve',
  requireRole('Administrator', 'Principal'),
  validate(deliveryIdSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, 200, await service.approveDelivery(req.params.id, req.user!));
  }),
);
router.post(
  '/:id/cancel',
  validate(deliveryIdSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, 200, await service.cancelDelivery(req.params.id, req.user!));
  }),
);
router.post(
  '/:id/retry',
  validate(deliveryIdSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, 200, await service.retryDelivery(req.params.id, req.user!));
  }),
);
export default router;
