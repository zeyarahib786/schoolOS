import { Router } from 'express';
import * as controller from './lms.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listAssignmentsSchema, createAssignmentSchema, submitSchema, gradeSchema } from './lms.validation';

const router = Router();

router.use(requireAuth);

router.get('/assignments', validate(listAssignmentsSchema), controller.listAssignments);
router.post(
  '/assignments',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(createAssignmentSchema),
  controller.createAssignment,
);
router.post('/assignments/:id/submit', requireRole('Student'), validate(submitSchema), controller.submit);

router.get('/submissions', controller.listSubmissions);
router.post(
  '/submissions/:id/grade',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(gradeSchema),
  controller.grade,
);

export default router;
