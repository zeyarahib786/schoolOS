import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './roles.controller';
import { createAccessRoleSchema, updatePermissionSchema } from './roles.validation';

const router = Router();

router.use(requireAuth);
router.get('/me', controller.mine);
router.get('/', requireRole('Administrator'), controller.list);
router.post('/', requireRole('Administrator'), validate(createAccessRoleSchema), controller.create);
router.patch(
  '/:id/permissions/:module',
  requireRole('Administrator'),
  validate(updatePermissionSchema),
  controller.updatePermission,
);

export default router;
