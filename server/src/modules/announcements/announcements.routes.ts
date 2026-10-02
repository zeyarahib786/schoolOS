import { Router } from 'express';
import * as controller from './announcements.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listAnnouncementsSchema, createAnnouncementSchema, changeAnnouncementStatusSchema } from './announcements.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listAnnouncementsSchema), controller.list);
router.post(
  '/',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(createAnnouncementSchema),
  controller.create,
);
router.patch('/:id/status', requireRole('Administrator', 'Principal', 'Teacher'), validate(changeAnnouncementStatusSchema), controller.changeStatus);

export default router;
