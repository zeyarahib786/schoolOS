import { payslipPdf } from './payroll.pdf';
import { asyncHandler } from '../../middleware/errorHandler';
import { Router } from 'express';
import * as controller from './payroll.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  listPayslipsSchema,
  generatePayslipSchema,
  payPayslipSchema,
  payslipIdParamSchema,
} from './payroll.validation';

const router = Router();

router.use(requireAuth);

router.get(
  '/:id/pdf',
  validate(payslipIdParamSchema),
  asyncHandler(async (req, res) => {
    const bytes = await payslipPdf(req.params.id, req.user!);
    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="payslip-' + req.params.id + '.pdf"',
        'Cache-Control': 'private, no-store',
      })
      .send(bytes);
  }),
);
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
  validate(payPayslipSchema),
  controller.markPaid,
);

export default router;
