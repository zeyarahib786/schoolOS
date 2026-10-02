import { Router } from 'express';
import * as controller from './alumni.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listAlumniSchema, graduateSchema } from './alumni.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listAlumniSchema), controller.list);
router.post(
  '/graduate',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(graduateSchema),
  controller.graduate,
);

export default router;
