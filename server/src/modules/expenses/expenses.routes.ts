import { Router } from 'express';
import * as controller from './expenses.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listClaimsSchema, submitClaimSchema, reviewClaimSchema } from './expenses.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listClaimsSchema), controller.list);
router.post(
  '/',
  requireRole('Administrator', 'Principal', 'Teacher', 'Accountant'),
  validate(submitClaimSchema),
  controller.submit,
);
router.post(
  '/:id/review',
  requireRole('Administrator', 'Principal', 'Accountant'),
  validate(reviewClaimSchema),
  controller.review,
);

export default router;
