import { Router } from 'express';
import * as controller from './facilities.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listBookingsSchema, createBookingSchema, createFacilitySchema } from './facilities.validation';

const router = Router();

router.use(requireAuth);

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
