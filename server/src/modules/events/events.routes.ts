import { Router } from 'express';
import * as controller from './events.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listEventsSchema, createEventSchema } from './events.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listEventsSchema), controller.list);
router.post('/', requireRole('Administrator', 'Principal', 'Teacher'), validate(createEventSchema), controller.create);

export default router;
