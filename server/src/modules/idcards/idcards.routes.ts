import { Router } from 'express';
import * as controller from './idcards.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listCardsSchema, issueCardSchema, cardIdParamSchema } from './idcards.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listCardsSchema), controller.list);
router.post('/', requireRole('Administrator', 'Principal', 'Teacher'), validate(issueCardSchema), controller.issue);
router.post('/:id/report-lost', validate(cardIdParamSchema), controller.reportLost);
router.post(
  '/:id/revoke',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(cardIdParamSchema),
  controller.revoke,
);

router.get('/:id/pdf', validate(cardIdParamSchema), controller.pdf);

export default router;
