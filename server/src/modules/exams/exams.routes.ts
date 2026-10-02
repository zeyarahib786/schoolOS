import { Router } from 'express';
import * as controller from './exams.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  listExamsSchema,
  createExamSchema,
  examIdParamSchema,
  addSubjectSchema,
  removeSubjectSchema,
  listResultsSchema,
  recordResultSchema,
  publishExamSchema,
  generateReportCardsSchema,
  notifyResultSchema,
} from './exams.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listExamsSchema), controller.listExams);
router.post(
  '/',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(createExamSchema),
  controller.createExam,
);
router.get('/:id/summary', validate(examIdParamSchema), controller.getSummary);
router.post('/:id/publish', requireRole('Administrator', 'Principal', 'Teacher'), validate(publishExamSchema), controller.publishExam);
router.post('/:id/reopen', requireRole('Administrator', 'Principal', 'Teacher'), validate(publishExamSchema), controller.reopenExam);
router.post('/:id/report-cards', requireRole('Administrator', 'Principal', 'Teacher'), validate(generateReportCardsSchema), controller.generateReportCards);
router.post('/:id/results/:studentId/notify', requireRole('Administrator', 'Principal', 'Teacher'), validate(notifyResultSchema), controller.notifyGuardian);
router.post(
  '/:id/subjects',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(addSubjectSchema),
  controller.addSubject,
);
router.delete(
  '/:id/subjects/:subject',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(removeSubjectSchema),
  controller.removeSubject,
);

router.get('/results', validate(listResultsSchema), controller.listResults);
router.post(
  '/results',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(recordResultSchema),
  controller.recordResult,
);

export default router;
