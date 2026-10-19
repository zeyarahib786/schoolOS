import mongoose from 'mongoose';
import { Event } from '../../models/Event';
import { Booking } from '../../models/Booking';
import { Facility } from '../../models/Facility';
import { logAudit } from '../audit/audit.service';
import { z } from 'zod';
import { updateEventSchema, cancelEventSchema } from './events.validation';
import { ApiError } from '../../utils/ApiError';
import { IEvent } from '../../models/Event';
import * as repo from './events.repository';
import * as facilitiesRepo from '../facilities/facilities.repository';
import { ListEventsQuery, CreateEventInput } from './events.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role, WRITE_ROLES } from '../../types/roles';

function canManageEvents(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}

export async function listEvents(query: ListEventsQuery, requester: AuthenticatedUser) {
  const { items, total } = await repo.findMany(query, requester);
  return {
    items: items.map((item) => {
      const row = item.toObject();
      if (!canManageEvents(requester.role)) row.history = [];
      return row;
    }),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

/** Event and linked venue reservation commit together through the shared booking operation. */
export async function createEvent(input: CreateEventInput, requester: AuthenticatedUser): Promise<IEvent> {
  if (!canManageEvents(requester.role)) throw ApiError.forbidden('Teaching staff role required');
  const session = await mongoose.startSession();
  let created: IEvent | null = null;
  try {
    await session.withTransaction(async () => {
      const booking = input.venue
        ? await facilitiesRepo.createBookingInSession(
            {
              facilityId: input.venue.facilityId,
              date: input.date,
              startTime: input.venue.startTime,
              endTime: input.venue.endTime,
              purpose: 'Event: ' + input.title,
            },
            requester.id,
            session,
          )
        : null;
      created = (
        await Event.create(
          [
            {
              title: input.title,
              description: input.description,
              date: new Date(input.date),
              audience: input.audience,
              createdBy: requester.id,
              booking: booking?._id,
            },
          ],
          { session },
        )
      )[0];
    });
    if (!created) throw new Error('Event transaction produced no record');
    await logAudit('Created calendar event ' + input.title, 'Calendar', requester.id);
    return created;
  } catch (error) {
    if ((error as { code?: string }).code === 'OVERLAP')
      throw ApiError.conflict('The selected venue is already booked for this time');
    if ((error as { code?: string }).code === 'FACILITY_NOT_FOUND') throw ApiError.notFound('Facility not found');
    throw error;
  } finally {
    await session.endSession();
  }
}
export async function updateEvent(
  id: string,
  input: z.infer<typeof updateEventSchema>['body'],
  requester: AuthenticatedUser,
) {
  if (!canManageEvents(requester.role)) throw ApiError.forbidden('Teaching staff role required');
  const current = await Event.findById(id);
  if (!current) throw ApiError.notFound('Event not found');
  if (current.booking && current.date.toISOString().slice(0, 10) !== input.date)
    throw ApiError.conflict('Cancel and recreate a venue-linked event to change its reserved day');
  const { expectedUpdatedAt, reason, ...fields } = input;
  const saved = await Event.findOneAndUpdate(
    { _id: id, updatedAt: new Date(expectedUpdatedAt), status: { $ne: 'Cancelled' } },
    {
      $set: { ...fields, date: new Date(input.date) },
      $push: {
        history: {
          at: new Date(),
          by: requester.id,
          reason,
          action: 'Reviewed',
          previous: {
            title: current.title,
            description: current.description,
            date: current.date,
            audience: current.audience,
          },
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!saved) throw ApiError.conflict('Event changed or cancelled; reload');
  await logAudit('Reviewed calendar event ' + id, 'Calendar', requester.id);
  return saved;
}
export async function cancelEvent(
  id: string,
  input: z.infer<typeof cancelEventSchema>['body'],
  requester: AuthenticatedUser,
) {
  if (!canManageEvents(requester.role)) throw ApiError.forbidden('Teaching staff role required');
  const session = await mongoose.startSession();
  let saved: IEvent | null = null;
  try {
    await session.withTransaction(async () => {
      const current = await Event.findById(id).session(session);
      if (!current) throw ApiError.notFound('Event not found');
      if (current.booking) {
        const booking = await Booking.findById(current.booking).session(session);
        if (!booking) throw ApiError.conflict('Linked reservation is missing; review the event before cancellation');
        await Facility.findByIdAndUpdate(booking.facility, { $inc: { bookingRevision: 1 } }, { session });
        await Booking.updateOne(
          { _id: booking._id },
          { $set: { status: 'Cancelled', cancelledAt: new Date() } },
          { session },
        );
      }
      saved = await Event.findOneAndUpdate(
        { _id: id, updatedAt: new Date(input.expectedUpdatedAt), status: { $ne: 'Cancelled' } },
        {
          $set: { status: 'Cancelled' },
          $push: { history: { at: new Date(), by: requester.id, action: 'Cancelled', reason: input.reason } },
        },
        { new: true, session },
      );
      if (!saved) throw ApiError.conflict('Event changed or already cancelled; reload');
    });
    await logAudit('Cancelled calendar event ' + id, 'Calendar', requester.id);
    return saved;
  } finally {
    await session.endSession();
  }
}
