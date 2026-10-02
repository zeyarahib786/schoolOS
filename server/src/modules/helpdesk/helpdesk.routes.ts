import { Router } from 'express';
import * as controller from './helpdesk.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listTicketsSchema, raiseTicketSchema, transitionTicketSchema } from './helpdesk.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listTicketsSchema), controller.list);
router.post('/', validate(raiseTicketSchema), controller.raise); // open to every authenticated role - no requireRole
router.post(
  '/:id/transition',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(transitionTicketSchema),
  controller.transition,
);

export default router;
