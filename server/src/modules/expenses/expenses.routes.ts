import { Router } from 'express';
import * as controller from './expenses.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  listClaimsSchema,
  submitClaimSchema,
  reviewClaimSchema,
  payClaimSchema,
  cancelClaimSchema,
} from './expenses.validation';

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

router.post(
  '/:id/pay',
  requireRole('Administrator', 'Principal', 'Accountant'),
  validate(payClaimSchema),
  controller.pay,
);
router.post(
  '/:id/cancel',
  requireRole('Administrator', 'Principal', 'Teacher', 'Accountant'),
  validate(cancelClaimSchema),
  controller.cancel,
);

export default router;
