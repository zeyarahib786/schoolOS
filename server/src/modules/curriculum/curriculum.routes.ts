import { Router } from 'express';
import * as controller from './curriculum.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listUnitsSchema, createUnitSchema, updateUnitSchema, unitIdParamSchema } from './curriculum.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listUnitsSchema), controller.list);
router.get('/subjects', controller.subjects);
router.post('/', requireRole('Administrator', 'Principal', 'Teacher'), validate(createUnitSchema), controller.create);
router.patch(
  '/:id',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(updateUnitSchema),
  controller.update,
);
router.delete(
  '/:id',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(unitIdParamSchema),
  controller.remove,
);

export default router;
