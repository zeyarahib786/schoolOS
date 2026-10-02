import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './crm.controller';
import { archiveCrmLeadSchema, createCrmLeadSchema, crmIdSchema, listCrmLeadsSchema, logCrmActivitySchema, scheduleFollowUpSchema } from './crm.validation';

const router = Router();
router.use(requireAuth, requireRole('Administrator', 'Principal'));
router.get('/', validate(listCrmLeadsSchema), controller.list);
router.post('/', validate(createCrmLeadSchema), controller.create);
router.post('/:id/advance', validate(crmIdSchema), controller.advance);
router.put('/:id/follow-up', validate(scheduleFollowUpSchema), controller.schedule);
router.post('/:id/activity', validate(logCrmActivitySchema), controller.activity);
router.post('/:id/archive', validate(archiveCrmLeadSchema), controller.archive);
router.post('/:id/restore', validate(crmIdSchema), controller.restore);
router.post('/:id/convert', validate(crmIdSchema), controller.convert);
router.delete('/:id', validate(crmIdSchema), controller.remove);
export default router;
