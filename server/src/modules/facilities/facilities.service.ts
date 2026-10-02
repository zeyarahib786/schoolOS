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
