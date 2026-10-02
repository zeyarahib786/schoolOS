import { Router } from 'express';
import * as controller from './meetings.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listSlotsSchema, createSlotSchema, bookSlotSchema, staffBookSlotSchema, slotIdSchema, rescheduleSlotSchema } from './meetings.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listSlotsSchema), controller.list);
router.post('/', requireRole('Administrator', 'Principal', 'Teacher'), validate(createSlotSchema), controller.create);
router.post('/:id/book', requireRole('Parent'), validate(bookSlotSchema), controller.book);
router.post('/:id/book-on-behalf', requireRole('Administrator', 'Principal'), validate(staffBookSlotSchema), controller.staffBook);
router.post('/:id/confirm', requireRole('Administrator', 'Principal'), validate(slotIdSchema), controller.confirm);
router.post('/:id/cancel', requireRole('Administrator', 'Principal'), validate(slotIdSchema), controller.cancel);
router.post('/:id/reschedule', requireRole('Administrator', 'Principal'), validate(rescheduleSlotSchema), controller.reschedule);
router.post('/:id/notify', requireRole('Administrator', 'Principal'), validate(slotIdSchema), controller.notify);

export default router;
