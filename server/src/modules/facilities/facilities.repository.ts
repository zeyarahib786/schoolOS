import { ApiError } from '../../utils/ApiError';
import mongoose, { FilterQuery } from 'mongoose';
import { Booking, IBooking } from '../../models/Booking';
import { Facility, IFacility } from '../../models/Facility';
import { ListBookingsQuery, CreateBookingInput, CreateFacilityInput } from './facilities.validation';

export async function findManyBookings(query: ListBookingsQuery): Promise<{ items: IBooking[]; total: number }> {
  const filter: FilterQuery<IBooking> = {};
  if (query.facilityId) filter.facility = query.facilityId;
  if (query.date) filter.date = new Date(query.date);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Booking.find(filter)
      .sort({ date: 1, startTime: 1 })
      .skip(skip)
      .limit(query.limit)
      .populate('facility', 'name type')
      .populate('bookedBy', 'name email'),
    Booking.countDocuments(filter),
  ]);
  return { items, total };
}

export function findOverlapping(
  facilityId: string,
  date: Date,
  startTime: string,
  endTime: string,
  session?: mongoose.ClientSession,
) {
  // The overlap condition itself, expressed as a Mongo query - startTime < requestedEnd AND
  // requestedStart < endTime, the same half-open-interval test as facilities.overlap.ts's pure
  // function, here as a query so the DB does the filtering rather than pulling every booking for
  // the day into the app to check in memory.
  return Booking.findOne({
    facility: facilityId,
    status: { $ne: 'Cancelled' },
    date,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  }).session(session ?? null);
}

/**
 * The actual concurrency-safety mechanism for this module - and the first use of a real MongoDB
 * multi-document transaction in this codebase. A unique index (Attendance, Certificates) can't
 * express "no overlapping range," so the overlap CHECK and the booking INSERT are wrapped in a
 * single transaction instead: if two requests for genuinely overlapping slots run concurrently,
 * the transaction layer guarantees one succeeds and the other's overlap check will see the first
 * request's write (or the transaction is retried/aborted on write conflict), rather than both
 * checks racing against a stale "no overlap" read. Requires a replica-set-enabled MongoDB (Atlas
 * provides this by default) - documented explicitly in docs/setup/deployment.md and docs/setup/local.md,
 * since a plain standalone `mongod` does not support transactions at all.
 */
/** The shared booking operation can participate in an event transaction. */
export async function createBookingInSession(
  input: CreateBookingInput,
  bookedBy: string,
  session: mongoose.ClientSession,
): Promise<IBooking> {
  const date = new Date(input.date);
  const facility = await Facility.findByIdAndUpdate(
    input.facilityId,
    { $inc: { bookingRevision: 1 } },
    { session, new: true },
  );
  if (facility?.status === 'Maintenance') throw ApiError.conflict('Facility is under maintenance');
  if (!facility) throw Object.assign(new Error('FACILITY_NOT_FOUND'), { code: 'FACILITY_NOT_FOUND' });
  const existing = await findOverlapping(input.facilityId, date, input.startTime, input.endTime, session);
  if (existing) throw Object.assign(new Error('OVERLAP'), { code: 'OVERLAP' });
  const [created] = await Booking.create(
    [
      {
        facility: input.facilityId,
        date,
        startTime: input.startTime,
        endTime: input.endTime,
        bookedBy,
        purpose: input.purpose,
      },
    ],
    { session },
  );
  return created;
}
export async function createBookingIfNoOverlap(input: CreateBookingInput, bookedBy: string): Promise<IBooking> {
  const session = await mongoose.startSession();
  let created: IBooking | null = null;
  try {
    await session.withTransaction(async () => {
      created = await createBookingInSession(input, bookedBy, session);
    });
    if (!created) throw new Error('Booking transaction produced no document');
    return created;
  } finally {
    await session.endSession();
  }
}

export function findManyFacilities(): Promise<IFacility[]> {
  return Facility.find().sort({ name: 1 });
}

export function createFacility(input: CreateFacilityInput): Promise<IFacility> {
  return Facility.create(input);
}
