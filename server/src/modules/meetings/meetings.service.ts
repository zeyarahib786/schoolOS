import { ApiError } from '../../utils/ApiError';
import { Staff } from '../../models/Staff';
import { IMeetingSlot } from '../../models/MeetingSlot';
import * as repo from './meetings.repository';
import { ListSlotsQuery, CreateSlotInput, BookSlotInput } from './meetings.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role, WRITE_ROLES } from '../../types/roles';

function canPublishSlots(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}

/** Open read like Timetable: a bookable slot only has value if parents can browse it. */
export async function listSlots(query: ListSlotsQuery, requester: AuthenticatedUser) {
  const { items, total } = await repo.findMany(query, requester);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function publishSlot(input: CreateSlotInput, requester: AuthenticatedUser): Promise<IMeetingSlot> {
  if (!canPublishSlots(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may publish a meeting slot');
  const teacher = await Staff.findOne({ _id: input.teacherStaffId, type: 'Teaching', status: { $ne: 'Inactive' } });
  if (!teacher) throw ApiError.badRequest('Choose an existing active teaching staff record');
  if (requester.role === 'Teacher' && String(teacher.userId) !== requester.id)
    throw ApiError.forbidden('Teachers may publish only their own meeting slots');
  try {
    return await repo.create(input);
  } catch (err) {
    if (err instanceof Error && (err as Error & { code?: number }).code === 11000) {
      throw ApiError.conflict('This teacher already has a slot at that date and time');
    }
    throw err;
  }
}

/** ONLY a Parent may book (mirroring LMS's only-Student-submits asymmetry), and only for a
 * student genuinely linked to them via guardianUserId - resolved and enforced here, not trusted
 * from the request body. */
export async function bookSlot(
  slotId: string,
  input: BookSlotInput,
  requester: AuthenticatedUser,
): Promise<IMeetingSlot> {
  if (requester.role !== 'Parent') throw ApiError.forbidden('Only a Parent may book a meeting slot');

  const ownedStudent = await repo.findStudentOwnedByGuardian(input.studentId, requester.id);
  if (!ownedStudent) throw ApiError.forbidden('You can only book a meeting for your own child');

  const claimed = await repo.claimSlotIfOpen(slotId, requester.id, input.studentId);
  if (claimed) return claimed;

  // The claim failed - distinguish "slot doesn't exist" (404) from "already booked" (409),
  // querying only in this failure path so the happy path stays a single atomic operation.
  const slot = await repo.findById(slotId);
  if (!slot) throw ApiError.notFound('Meeting slot not found');
  throw ApiError.conflict('This slot has already been booked');
}
