import { Router } from 'express';
import * as controller from './library.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  listBooksSchema,
  createBookSchema,
  issueLoanSchema,
  loanIdParamSchema,
  listLoansSchema,
  createBookRequestSchema,
  listBookRequestsSchema,
  bookRequestIdParamSchema,
  sendRemindersSchema,
} from './library.validation';

const router = Router();

router.use(requireAuth);

router.get('/books', validate(listBooksSchema), controller.listBooks);
router.post(
  '/books',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(createBookSchema),
  controller.addBook,
);

router.get('/loans', validate(listLoansSchema), controller.listLoans);
router.post(
  '/loans',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(issueLoanSchema),
  controller.issue,
);
router.post(
  '/loans/:id/return',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(loanIdParamSchema),
  controller.returnBook,
);
router.get('/requests', validate(listBookRequestsSchema), controller.listRequests);
router.post('/requests', validate(createBookRequestSchema), controller.createRequest);
router.post('/requests/:id/fulfill', requireRole('Administrator', 'Principal', 'Teacher'), validate(bookRequestIdParamSchema), controller.fulfillRequest);
router.post('/reminders', requireRole('Administrator', 'Principal', 'Teacher'), validate(sendRemindersSchema), controller.sendReminders);

export default router;
