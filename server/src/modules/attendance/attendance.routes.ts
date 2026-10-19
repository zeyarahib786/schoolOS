import { Router } from 'express';
import * as controller from './attendance.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  listAttendanceSchema,
  markAttendanceSchema,
  listStaffAttendanceSchema,
  markStaffAttendanceSchema,
  listAbsenceRequestsSchema,
  createAbsenceRequestSchema,
  absenceRequestIdParamSchema,
  decideAbsenceRequestSchema,
} from './attendance.validation';

import { saveRegisterSchema } from './attendance.validation';
const router = Router();

router.use(requireAuth);

router.get('/staff', validate(listStaffAttendanceSchema), controller.listStaff);
router.put(
  '/staff/me',
  requireRole('Administrator', 'Principal', 'Teacher', 'Accountant'),
  validate(markStaffAttendanceSchema),
  controller.markStaff,
);
router.get('/absence-requests', validate(listAbsenceRequestsSchema), controller.listAbsenceRequests);
router.post('/absence-requests', validate(createAbsenceRequestSchema), controller.createAbsenceRequest);
router.post('/absence-requests/:id/cancel', validate(absenceRequestIdParamSchema), controller.cancelAbsenceRequest);
router.post(
  '/absence-requests/:id/decision',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(decideAbsenceRequestSchema),
  controller.decideAbsenceRequest,
);
router.get('/', validate(listAttendanceSchema), controller.list);
router.post(
  '/mark',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(markAttendanceSchema),
  controller.mark,
);
router.put(
  '/mark',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(markAttendanceSchema),
  controller.save,
);

router.put(
  '/register',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(saveRegisterSchema),
  controller.register,
);
export default router;
