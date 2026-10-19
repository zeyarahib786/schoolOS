import mongoose from 'mongoose';
import { Facility } from '../../models/Facility';
import { Booking } from '../../models/Booking';
import { Event } from '../../models/Event';
import { logAudit } from '../audit/audit.service';
import { z } from 'zod';
import { reviewFacilitySchema, cancelBookingSchema } from './facilities.validation';
import { ApiError } from '../../utils/ApiError';
import { IBooking } from '../../models/Booking';
import { IFacility } from '../../models/Facility';
import * as repo from './facilities.repository';
import { ListBookingsQuery, CreateBookingInput, CreateFacilityInput } from './facilities.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role, WRITE_ROLES } from '../../types/roles';

function canManageFacilities(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}

export async function listBookings(query: ListBookingsQuery) {
  const { items, total } = await repo.findManyBookings(query);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function createBooking(input: CreateBookingInput, requester: AuthenticatedUser): Promise<IBooking> {
  if (!canManageFacilities(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may book a facility');
  try {
    return await repo.createBookingIfNoOverlap(input, requester.id);
  } catch (err) {
    const code = err instanceof Error ? (err as Error & { code?: string }).code : undefined;
    if (code === 'OVERLAP') {
      throw ApiError.conflict('This facility is already booked for an overlapping time on the requested date');
    }
    if (code === 'FACILITY_NOT_FOUND') throw ApiError.notFound('Facility not found');
    throw err;
  }
}

export function listFacilities(): Promise<IFacility[]> {
  return repo.findManyFacilities();
}

export async function addFacility(input: CreateFacilityInput, requester: AuthenticatedUser): Promise<IFacility> {
  if (!canManageFacilities(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may add a facility');
  return repo.createFacility(input);
}

export async function reviewFacility(
  id: string,
  input: z.infer<typeof reviewFacilitySchema>['body'],
  requester: AuthenticatedUser,
) {
  if (!canManageFacilities(requester.role)) throw ApiError.forbidden('School facility staff required');
  const current = await Facility.findById(id);
  if (!current) throw ApiError.notFound('Facility not found');
  const { expectedUpdatedAt, reason, ...fields } = input;
  const saved = await Facility.findOneAndUpdate(
    { _id: id, updatedAt: new Date(expectedUpdatedAt) },
    {
      $set: fields,
      $inc: { bookingRevision: 1 },
      $push: {
        history: {
          at: new Date(),
          by: requester.id,
          reason,
          previous: { name: current.name, type: current.type, capacity: current.capacity, status: current.status },
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!saved) throw ApiError.conflict('Facility changed; reload before review');
  await logAudit('Reviewed facility ' + id, 'Facilities', requester.id);
  return saved;
}
export async function cancelBooking(
  id: string,
  input: z.infer<typeof cancelBookingSchema>['body'],
  requester: AuthenticatedUser,
) {
  if (!canManageFacilities(requester.role)) throw ApiError.forbidden('School facility staff required');
  const session = await mongoose.startSession();
  let saved: IBooking | null = null;
  try {
    await session.withTransaction(async () => {
      const current = await Booking.findById(id).session(session);
      if (!current) throw ApiError.notFound('Booking not found');
      if (await Event.exists({ booking: id, status: { $ne: 'Cancelled' } }).session(session))
        throw ApiError.conflict('Cancel the linked calendar event to release this venue reservation');
      await Facility.findByIdAndUpdate(current.facility, { $inc: { bookingRevision: 1 } }, { session });
      saved = await Booking.findOneAndUpdate(
        { _id: id, updatedAt: new Date(input.expectedUpdatedAt), status: { $ne: 'Cancelled' } },
        {
          $set: { status: 'Cancelled', cancelledAt: new Date() },
          $push: { history: { at: new Date(), by: requester.id, action: 'Cancelled', reason: input.reason } },
        },
        { new: true, session },
      );
      if (!saved) throw ApiError.conflict('Booking changed or already cancelled; reload');
    });
    await logAudit('Cancelled facility booking ' + id, 'Facilities', requester.id);
    return saved;
  } finally {
    await session.endSession();
  }
}
