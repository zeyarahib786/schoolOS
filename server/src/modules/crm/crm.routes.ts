import { bulkCrmEmailSchema, editCrmLeadSchema } from './crm.validation';
import { queueBulkEmail, leadDeliveries } from './crm.email.service';
import { queueCrmEmail } from '../notifications/notifications.service';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import * as service from './crm.service';
import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './crm.controller';
import {
  archiveCrmLeadSchema,
  createCrmLeadSchema,
  crmIdSchema,
  listCrmLeadsSchema,
  logCrmActivitySchema,
  scheduleFollowUpSchema,
} from './crm.validation';

const router = Router();
router.use(requireAuth, requireRole('Administrator', 'Principal'));
router.post(
  '/bulk-email',
  validate(bulkCrmEmailSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, 201, await queueBulkEmail(req.body, req.user!));
  }),
);
router.patch(
  '/:id',
  validate(editCrmLeadSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, 200, await service.editLead(req.params.id, req.body, req.user!));
  }),
);
router.get(
  '/:id/deliveries',
  validate(crmIdSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, 200, await leadDeliveries(req.params.id));
  }),
);
router.post(
  '/:id/email',
  validate(
    z.object({
      params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }),
      body: z.object({
        subject: z.string().trim().min(1).max(160),
        body: z.string().trim().min(1).max(5000),
        idempotencyKey: z.string().min(8).max(100),
      }),
    }),
  ),
  asyncHandler(async (req, res) => {
    sendSuccess(res, 201, await queueCrmEmail(req.params.id, req.body, req.user!));
  }),
);
router.get(
  '/assignees',
  asyncHandler(async (_req, res) => {
    sendSuccess(res, 200, await service.listAssignees());
  }),
);
router.post(
  '/:id/assign',
  validate(
    z.object({
      params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }),
      body: z.object({ ownerId: z.string().regex(/^[a-f\d]{24}$/i) }),
    }),
  ),
  asyncHandler(async (req, res) => {
    sendSuccess(res, 200, await service.assignLead(req.params.id, req.body.ownerId, req.user!));
  }),
);
router.post(
  '/:id/complete-follow-up',
  validate(
    z.object({
      params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }),
      body: z.object({ note: z.string().trim().min(3).max(400) }),
    }),
  ),
  asyncHandler(async (req, res) => {
    sendSuccess(res, 200, await service.completeFollowUp(req.params.id, req.body.note, req.user!));
  }),
);
router.get('/', validate(listCrmLeadsSchema), controller.list);
router.post('/', validate(createCrmLeadSchema), controller.create);
router.post('/:id/advance', validate(crmIdSchema), controller.advance);
router.put('/:id/follow-up', validate(scheduleFollowUpSchema), controller.schedule);
router.post('/:id/activity', validate(logCrmActivitySchema), controller.activity);
router.post('/:id/archive', validate(archiveCrmLeadSchema), controller.archive);
router.post('/:id/restore', validate(crmIdSchema), controller.restore);
router.post('/:id/convert', validate(crmIdSchema), controller.convert);
router.delete('/:id', validate(crmIdSchema), controller.remove);
export default router;
