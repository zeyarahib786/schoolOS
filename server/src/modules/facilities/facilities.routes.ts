import { Router } from 'express';
import * as controller from './facilities.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  listBookingsSchema,
  createBookingSchema,
  createFacilitySchema,
  reviewFacilitySchema,
  cancelBookingSchema,
} from './facilities.validation';

const router = Router();

router.use(requireAuth);
router.use(requireRole('Administrator', 'Principal', 'Teacher', 'Accountant'));
router.patch(
  '/facilities/:id',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(reviewFacilitySchema),
  controller.review,
);
router.post(
  '/bookings/:id/cancel',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(cancelBookingSchema),
  controller.cancel,
);

router.get('/facilities', controller.listFacilities);
router.post(
  '/facilities',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(createFacilitySchema),
  controller.addFacility,
);

router.get('/bookings', validate(listBookingsSchema), controller.listBookings);
router.post(
  '/bookings',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(createBookingSchema),
  controller.createBooking,
);

export default router;
