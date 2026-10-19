import { Router } from 'express';
import * as controller from './visitors.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listVisitorsSchema, checkInSchema, visitorIdParamSchema, updateVisitorSchema } from './visitors.validation';

const router = Router();

router.use(requireAuth);
router.use(requireRole('Administrator', 'Principal', 'Teacher')); // entire module is staff-only, both read and write

router.get('/', validate(listVisitorsSchema), controller.list);
router.post('/', validate(checkInSchema), controller.checkIn);
router.post('/:id/checkout', validate(visitorIdParamSchema), controller.checkOut);

router.patch('/:id', validate(updateVisitorSchema), controller.update);

export default router;
