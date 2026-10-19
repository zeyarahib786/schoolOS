import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './classes.controller';
import { createClassSchema, listClassesSchema, updateClassSchema } from './classes.validation';

const router = Router();
router.use(requireAuth);
router.get('/', validate(listClassesSchema), controller.list);
router.post('/', requireRole('Administrator', 'Principal', 'Teacher'), validate(createClassSchema), controller.create);

router.patch('/:id', requireRole('Administrator', 'Principal'), validate(updateClassSchema), controller.update);
export default router;
