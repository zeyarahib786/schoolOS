import { Router } from 'express';
import * as controller from './biometric.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { createDeviceSchema, deviceIdParamSchema, updateDeviceSchema } from './biometric.validation';

const router = Router();

router.use(requireAuth);
router.use(requireRole('Administrator', 'Principal', 'Teacher')); // infrastructure module - staff-only, matching Visitors' whole-module gate

router.get('/', controller.list);
router.post('/', validate(createDeviceSchema), controller.create);
router.post('/:id/sync', validate(deviceIdParamSchema), controller.sync);

router.patch('/:id', validate(updateDeviceSchema), controller.update);

export default router;
