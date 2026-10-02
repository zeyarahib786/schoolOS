import { Router } from 'express';
import * as controller from './timetable.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  listSlotsSchema,
  createSlotSchema,
  updateSlotSchema,
  slotIdSchema,
  publishGradeSchema,
  swapSlotsSchema,
} from './timetable.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listSlotsSchema), controller.list);
router.post('/', requireRole('Administrator', 'Principal', 'Teacher'), validate(createSlotSchema), controller.create);

router.post('/publish', requireRole('Administrator', 'Principal', 'Teacher'), validate(publishGradeSchema), controller.publish);
router.post('/swap', requireRole('Administrator', 'Principal', 'Teacher'), validate(swapSlotsSchema), controller.swap);
router.patch('/:id', requireRole('Administrator', 'Principal', 'Teacher'), validate(updateSlotSchema), controller.update);
router.delete('/:id', requireRole('Administrator', 'Principal', 'Teacher'), validate(slotIdSchema), controller.remove);
export default router;
