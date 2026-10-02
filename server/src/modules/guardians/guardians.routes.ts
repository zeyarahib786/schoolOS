import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './guardians.controller';
import { guardianIdSchema, listBroadcastsSchema, listGuardiansSchema, sendBroadcastSchema, sendGuardianMessageSchema, updatePortalSchema } from './guardians.validation';

const router = Router();
router.use(requireAuth, requireRole('Administrator', 'Principal'));
router.get('/', validate(listGuardiansSchema), controller.list);
router.get('/broadcasts', validate(listBroadcastsSchema), controller.broadcasts);
router.post('/broadcasts', validate(sendBroadcastSchema), controller.broadcast);
router.patch('/:id/portal', validate(updatePortalSchema), controller.portal);
router.get('/:id/messages', validate(guardianIdSchema), controller.messages);
router.post('/:id/messages', validate(sendGuardianMessageSchema), controller.message);
export default router;

