import { Router } from 'express';
import * as controller from './messages.controller';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import {
  listMessagesSchema,
  sendMessageSchema,
  messageIdParamSchema,
  archiveMessageSchema,
} from './messages.validation';

const router = Router();

router.use(requireAuth);

// No role gates anywhere: every authenticated user can correspond, and the $or scope (with no
// administrative override) is the entire access model.
router.get('/', validate(listMessagesSchema), controller.list);
router.post('/', validate(sendMessageSchema), controller.send);
router.post('/:id/read', validate(messageIdParamSchema), controller.markRead);

router.post('/:id/archive', validate(archiveMessageSchema), controller.archive);
export default router;
