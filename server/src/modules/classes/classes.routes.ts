import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './classes.controller';
import { createClassSchema, listClassesSchema } from './classes.validation';

const router = Router();
router.use(requireAuth);
router.get('/', validate(listClassesSchema), controller.list);
router.post('/', requireRole('Administrator', 'Principal', 'Teacher'), validate(createClassSchema), controller.create);

export default router;
