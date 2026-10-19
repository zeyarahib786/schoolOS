import { Router } from 'express';
import * as controller from './helpdesk.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listTicketsSchema, raiseTicketSchema, transitionTicketSchema, replyTicketSchema } from './helpdesk.validation';

const router = Router();

router.use(requireAuth);
router.get('/assignees', requireRole('Administrator', 'Principal', 'Teacher'), controller.assignees);
router.post('/:id/replies', validate(replyTicketSchema), controller.reply);

router.get('/', validate(listTicketsSchema), controller.list);
router.post('/', validate(raiseTicketSchema), controller.raise); // open to every authenticated role - no requireRole
router.post(
  '/:id/transition',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(transitionTicketSchema),
  controller.transition,
);

export default router;
