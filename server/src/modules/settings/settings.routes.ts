import { Router } from 'express';
import * as controller from './settings.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { updateSettingsSchema } from './settings.validation';

const router = Router();

router.use(requireAuth);

router.get('/', controller.get); // open read: school name / academic year is basic context for everyone
router.put('/', requireRole('Administrator'), validate(updateSettingsSchema), controller.update);

export default router;
