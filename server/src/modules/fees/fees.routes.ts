import { Router } from 'express';
import * as controller from './fees.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  listInvoicesSchema,
  createInvoiceSchema,
  recordPaymentSchema,
  studentPaymentSchema,
  listPaymentsSchema,
  sendFeeRemindersSchema,
} from './fees.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listInvoicesSchema), controller.list);
router.get('/payments', validate(listPaymentsSchema), controller.listPayments);
router.post(
  '/payments',
  requireRole('Administrator', 'Principal', 'Accountant'),
  validate(studentPaymentSchema),
  controller.recordStudentPayment,
);
router.post(
  '/reminders',
  requireRole('Administrator', 'Principal', 'Accountant'),
  validate(sendFeeRemindersSchema),
  controller.sendReminders,
);
router.post(
  '/',
  requireRole('Administrator', 'Principal', 'Accountant'),
  validate(createInvoiceSchema),
  controller.create,
);
router.post(
  '/:id/pay',
  requireRole('Administrator', 'Principal', 'Accountant'),
  validate(recordPaymentSchema),
  controller.recordPayment,
);

export default router;
