import { Router } from 'express';
import * as controller from './biometric.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { createDeviceSchema, deviceIdParamSchema } from './biometric.validation';

const router = Router();

router.use(requireAuth);
router.use(requireRole('Administrator', 'Principal', 'Teacher')); // infrastructure module - staff-only, matching Visitors' whole-module gate

router.get('/', controller.list);
router.post('/', validate(createDeviceSchema), controller.create);
router.post('/:id/sync', validate(deviceIdParamSchema), controller.sync);

export default router;
