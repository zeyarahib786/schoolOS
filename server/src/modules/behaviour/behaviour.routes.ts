import { Router } from 'express';
import * as controller from './behaviour.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listIncidentsSchema, createIncidentSchema, updateIncidentStatusSchema } from './behaviour.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listIncidentsSchema), controller.list);
router.post(
  '/',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(createIncidentSchema),
  controller.create,
);
router.patch('/:id/status', requireRole('Administrator', 'Principal', 'Teacher'), validate(updateIncidentStatusSchema), controller.updateStatus);

export default router;
