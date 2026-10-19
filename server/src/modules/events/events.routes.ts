import { Router } from 'express';
import * as controller from './events.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listEventsSchema, createEventSchema, updateEventSchema, cancelEventSchema } from './events.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listEventsSchema), controller.list);
router.post('/', requireRole('Administrator', 'Principal', 'Teacher'), validate(createEventSchema), controller.create);

router.patch(
  '/:id',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(updateEventSchema),
  controller.update,
);
router.post(
  '/:id/cancel',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(cancelEventSchema),
  controller.cancel,
);

export default router;
