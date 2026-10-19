import { Router } from 'express';
import * as controller from './reports.controller';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireRole('Administrator', 'Principal'));

router.get('/insights', controller.insights);
router.get('/overview', controller.overview);

export default router;
