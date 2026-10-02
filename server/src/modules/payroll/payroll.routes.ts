import { Router } from 'express';
import * as controller from './payroll.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listPayslipsSchema, generatePayslipSchema, payslipIdParamSchema } from './payroll.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listPayslipsSchema), controller.list);
router.post(
  '/',
  requireRole('Administrator', 'Principal', 'Accountant'),
  validate(generatePayslipSchema),
  controller.generate,
);
router.post(
  '/:id/pay',
  requireRole('Administrator', 'Principal', 'Accountant'),
  validate(payslipIdParamSchema),
  controller.markPaid,
);

export default router;
