import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { InboxNotification } from '../../models/InboxNotification';

const router = Router();
router.use(requireAuth);
router.get(
  '/',
  validate(
    z.object({
      query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        unread: z.enum(['true', 'false']).optional(),
      }),
    }),
  ),
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page),
      scope = { recipient: req.user!.id };
    const filter = { ...scope, ...(req.query.unread === 'true' ? { readAt: null } : {}) };
    const [items, total, unread] = await Promise.all([
      InboxNotification.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * 25)
        .limit(25),
      InboxNotification.countDocuments(filter),
      InboxNotification.countDocuments({ ...scope, readAt: null }),
    ]);
    sendSuccess(res, 200, items, { pagination: { page, limit: 25, total, totalPages: Math.ceil(total / 25) }, unread });
  }),
);
router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await InboxNotification.updateMany({ recipient: req.user!.id, readAt: null }, { $set: { readAt: new Date() } });
    sendSuccess(res, 200, { read: true });
  }),
);
router.post(
  '/:id/read',
  validate(z.object({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }) })),
  asyncHandler(async (req, res) => {
    const row = await InboxNotification.findOne({ _id: req.params.id, recipient: req.user!.id });
    if (!row) throw ApiError.notFound('Notification not found');
    if (!row.readAt) {
      row.readAt = new Date();
      await row.save();
    }
    sendSuccess(res, 200, row);
  }),
);
export default router;
