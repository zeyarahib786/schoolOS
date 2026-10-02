import { Router } from 'express';
import * as controller from './surveys.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listSurveysSchema, createSurveySchema, surveyIdParamSchema, submitResponseSchema } from './surveys.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listSurveysSchema), controller.list);
router.post('/', requireRole('Administrator', 'Principal', 'Teacher'), validate(createSurveySchema), controller.create);
router.post(
  '/:id/activate',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(surveyIdParamSchema),
  controller.activate,
);
router.post(
  '/:id/close',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(surveyIdParamSchema),
  controller.close,
);
router.get('/:id/results', validate(surveyIdParamSchema), controller.results);
router.post('/:id/respond', validate(submitResponseSchema), controller.respond); // open to every role

export default router;
