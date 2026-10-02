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

export async function listEvents(query: ListEventsQuery) {
  const { items, total } = await repo.findMany(query);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

/**
 * Genuine cross-module composition: rather than re-implementing overlap prevention here (which
 * would risk the two systems silently diverging - e.g. if Facilities' overlap rule changed later
 * and Events' copy didn't), a venue-linked event calls STRAIGHT INTO
 * facilities.repository.createBookingIfNoOverlap - the exact same transaction-wrapped function
 * Facilities' own booking endpoint uses. If the venue is unavailable, event creation fails with
 * the same 409 a direct facility booking would - there is no path that creates an event claiming
 * a venue that was never actually, safely reserved.
 */
export async function createEvent(input: CreateEventInput, requester: AuthenticatedUser): Promise<IEvent> {
  if (!canManageEvents(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may create an event');

  let bookingId: string | undefined;
  if (input.venue) {
    try {
      const booking = await facilitiesRepo.createBookingIfNoOverlap(
        {
          facilityId: input.venue.facilityId,
          date: input.date,
          startTime: input.venue.startTime,
          endTime: input.venue.endTime,
          purpose: `Event: ${input.title}`,
        },
        requester.id,
      );
      bookingId = booking._id.toString();
    } catch (err) {
      if (err instanceof Error && (err as Error & { code?: string }).code === 'OVERLAP') {
        throw ApiError.conflict('The selected venue is already booked for an overlapping time on this date');
      }
      throw err;
    }
  }

  return repo.create({
    title: input.title,
    description: input.description,
    date: new Date(input.date),
    audience: input.audience,
    createdBy: requester.id,
    bookingId,
  });
}
