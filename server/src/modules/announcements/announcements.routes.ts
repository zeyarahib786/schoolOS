import { Router } from 'express';
import * as controller from './announcements.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  listAnnouncementsSchema,
  createAnnouncementSchema,
  changeAnnouncementStatusSchema,
  updateAnnouncementSchema,
  audiencePreviewSchema,
} from './announcements.validation';

const router = Router();

router.use(requireAuth);

router.get(
  '/audience-preview',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(audiencePreviewSchema),
  controller.preview,
);
router.patch(
  '/:id',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(updateAnnouncementSchema),
  controller.update,
);
router.get('/', validate(listAnnouncementsSchema), controller.list);
router.post(
  '/',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(createAnnouncementSchema),
  controller.create,
);
router.patch(
  '/:id/status',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(changeAnnouncementStatusSchema),
  controller.changeStatus,
);

export default router;
