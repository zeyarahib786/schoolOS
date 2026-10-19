import { Router } from 'express';
import * as controller from './hostel.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  reviewRoomSchema,
  dischargeSchema,
  createRoomSchema,
  listRoomsSchema,
  allocateSchema,
  listHostelLeaveSchema,
  createHostelLeaveSchema,
  hostelLeaveTransitionSchema,
  listRollCallSchema,
  markRollCallSchema,
  markAllRollCallSchema,
  listHostelMaintenanceSchema,
  createHostelMaintenanceSchema,
  resolveHostelMaintenanceSchema,
} from './hostel.validation';

const router = Router();

router.use(requireAuth);

router.get('/rooms', validate(listRoomsSchema), controller.listRooms);
router.post(
  '/rooms',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(createRoomSchema),
  controller.addRoom,
);
router.get('/leave', validate(listHostelLeaveSchema), controller.listLeave);
router.post(
  '/leave',
  requireRole('Administrator', 'Principal', 'Teacher', 'Parent', 'Student'),
  validate(createHostelLeaveSchema),
  controller.createLeave,
);
router.post(
  '/leave/:id/transition',
  requireRole('Administrator', 'Principal', 'Teacher', 'Parent', 'Student'),
  validate(hostelLeaveTransitionSchema),
  controller.transitionLeave,
);
router.get('/roll-call', validate(listRollCallSchema), controller.listRollCall);
router.put(
  '/roll-call',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(markRollCallSchema),
  controller.markRollCall,
);
router.put(
  '/roll-call/all',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(markAllRollCallSchema),
  controller.markAllRollCall,
);
router.get(
  '/maintenance',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(listHostelMaintenanceSchema),
  controller.listMaintenance,
);
router.post(
  '/maintenance',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(createHostelMaintenanceSchema),
  controller.createMaintenance,
);
router.post(
  '/maintenance/:id/resolve',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(resolveHostelMaintenanceSchema),
  controller.resolveMaintenance,
);
router.post(
  '/rooms/:id/allocate',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(allocateSchema),
  controller.allocate,
);

router.patch(
  '/rooms/:id',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(reviewRoomSchema),
  controller.reviewRoom,
);
router.post(
  '/rooms/:id/discharge',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(dischargeSchema),
  controller.discharge,
);
export default router;
