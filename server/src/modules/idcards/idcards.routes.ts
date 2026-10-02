import { Router } from 'express';
import * as controller from './idcards.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listCardsSchema, issueCardSchema, cardIdParamSchema } from './idcards.validation';

const router = Router();

router.use(requireAuth);
router.use(requireRole('Administrator', 'Principal', 'Teacher')); // whole-module gate: cards carry personal data; issuance is front-office work

router.get('/', validate(listCardsSchema), controller.list);
router.post('/', validate(issueCardSchema), controller.issue);
router.post('/:id/report-lost', validate(cardIdParamSchema), controller.reportLost);
router.post('/:id/revoke', validate(cardIdParamSchema), controller.revoke);

export default router;
