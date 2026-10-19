import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './guardians.controller';
import {
  guardianIdSchema,
  listBroadcastsSchema,
  listGuardiansSchema,
  sendBroadcastSchema,
  sendGuardianMessageSchema,
  updatePortalSchema,
  createGuardianSchema,
  updateGuardianSchema,
  guardianAccountSchema,
} from './guardians.validation';

const router = Router();
router.use(requireAuth);
const managers = requireRole('Administrator', 'Principal');
const readers = requireRole('Administrator', 'Principal', 'Parent');
router.get('/', readers, validate(listGuardiansSchema), controller.list);
router.get('/broadcasts', managers, validate(listBroadcastsSchema), controller.broadcasts);
router.post('/broadcasts', managers, validate(sendBroadcastSchema), controller.broadcast);
router.patch('/:id/portal', managers, validate(updatePortalSchema), controller.portal);
router.get('/:id/messages', readers, validate(guardianIdSchema), controller.messages);
router.post('/:id/messages', readers, validate(sendGuardianMessageSchema), controller.message);
router.get('/:id', readers, validate(guardianIdSchema), controller.get);
router.post('/', managers, validate(createGuardianSchema), controller.create);
router.patch('/:id', managers, validate(updateGuardianSchema), controller.update);
router.patch('/:id/account', managers, validate(guardianAccountSchema), controller.account);
export default router;
