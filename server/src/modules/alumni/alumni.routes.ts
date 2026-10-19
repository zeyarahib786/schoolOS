import { Router } from 'express';
import * as controller from './alumni.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listAlumniSchema, graduateSchema, updateAlumniSchema, alumniStudentSchema } from './alumni.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listAlumniSchema), controller.list);
router.post(
  '/graduate',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(graduateSchema),
  controller.graduate,
);

router.get(
  '/eligibility/:id',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(alumniStudentSchema),
  controller.eligibility,
);
router.patch(
  '/:id',
  requireRole('Administrator', 'Principal', 'Teacher', 'Student'),
  validate(updateAlumniSchema),
  controller.update,
);

export default router;
