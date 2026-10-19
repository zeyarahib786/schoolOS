import { Router } from 'express';
import * as controller from './leave.controller';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { listLeaveSchema, requestLeaveSchema, decideLeaveSchema, cancelLeaveSchema } from './leave.validation';

const router = Router();

router.use(requireAuth);

// No route-level role gate on request/list: ANY authenticated user with a linked Staff record can
// request their own leave (Teacher, Accountant, ...) - the service resolves and enforces the
// Staff link. The decide endpoint's Administrator/Principal-only rule lives in the service too,
// alongside the self-approval check that needs the request document anyway.
router.get('/', validate(listLeaveSchema), controller.list);
router.post('/', validate(requestLeaveSchema), controller.create);
router.post('/:id/decide', validate(decideLeaveSchema), controller.decide);

router.post('/:id/cancel', validate(cancelLeaveSchema), controller.cancel);
export default router;
