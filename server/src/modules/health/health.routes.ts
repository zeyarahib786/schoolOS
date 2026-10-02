import { Router } from 'express';
import * as controller from './health.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listVisitsSchema, createVisitSchema, updateVisitSchema } from './health.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listVisitsSchema), controller.list);
router.post('/', requireRole('Administrator', 'Principal', 'Teacher'), validate(createVisitSchema), controller.create);
router.patch('/:id', requireRole('Administrator', 'Principal'), validate(updateVisitSchema), controller.update);

export default router;
