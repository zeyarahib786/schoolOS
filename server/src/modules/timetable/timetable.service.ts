import { ApiError } from '../../utils/ApiError';
import { ITimetableSlot } from '../../models/TimetableSlot';
import * as repo from './timetable.repository';
import { ListSlotsQuery, CreateSlotInput, UpdateSlotInput, SwapSlotsInput } from './timetable.validation';
import { Role, WRITE_ROLES } from '../../types/roles';
import { AuthenticatedUser } from '../../middleware/auth';
import { logAudit } from '../audit/audit.service';

function canManageTimetable(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}

async function rejectCollision(
  slot: Pick<ITimetableSlot, 'dayOfWeek' | 'periodNumber' | 'teacherName'> & { room?: string },
  excludeId?: string,
) {
  const collision = await repo.findCollision(
    slot.dayOfWeek,
    slot.periodNumber,
    slot.teacherName,
    slot.room,
    excludeId,
  );
  if (!collision) return;
  const resource = collision.teacherName === slot.teacherName
    ? `Teacher ${slot.teacherName}`
    : `Room ${slot.room}`;
  throw ApiError.conflict(
    `${resource} is already scheduled for ${slot.dayOfWeek} period ${slot.periodNumber}`,
  );
}

/** Read is open to every authenticated role, like Curriculum - a timetable only has value if
 * students and parents can actually consult it. Writes are the standard staff gate. */
export function listSlots(query: ListSlotsQuery, requester: AuthenticatedUser): Promise<ITimetableSlot[]> {
  return repo.findMany(query, requester.role === 'Parent' || requester.role === 'Student');
}

export async function addSlot(input: CreateSlotInput, requester: AuthenticatedUser): Promise<ITimetableSlot> {
  if (!canManageTimetable(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may schedule a period');
  await rejectCollision(input);
  try {
    const created = await repo.create(input);
    await logAudit(`Scheduled ${created.subject} for ${created.grade}`, 'Timetable', requester.id);
    return created;
  } catch (err) {
    if (err instanceof Error && (err as Error & { code?: number }).code === 11000) {
      throw ApiError.conflict('The class, teacher, or room is already scheduled for this period');
    }
    throw err;
  }
}
export async function updateSlot(id: string, input: UpdateSlotInput, requester: AuthenticatedUser) {
  if (!canManageTimetable(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may edit a period');
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Timetable slot not found');
  await rejectCollision({
    dayOfWeek: existing.dayOfWeek,
    periodNumber: existing.periodNumber,
    teacherName: input.teacherName ?? existing.teacherName,
    room: input.room ?? existing.room,
  }, id);
  try {
    const slot = await repo.update(id, input);
    if (!slot) throw ApiError.notFound('Timetable slot not found');
    await logAudit(`Updated timetable slot for ${slot.grade}`, 'Timetable', requester.id);
    return slot;
  } catch (err) {
    if (err instanceof Error && (err as Error & { code?: number }).code === 11000)
      throw ApiError.conflict('The teacher or room is already scheduled for this period');
    throw err;
  }
}

export async function removeSlot(id: string, requester: AuthenticatedUser) {
  if (!canManageTimetable(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may remove a period');
  const slot = await repo.remove(id);
  if (!slot) throw ApiError.notFound('Timetable slot not found');
  await logAudit(`Removed ${slot.subject} from ${slot.grade}`, 'Timetable', requester.id, 'Warning');
  return slot;
}

export async function publishGrade(grade: string, requester: AuthenticatedUser) {
  if (!canManageTimetable(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may publish a timetable');
  const slots = await repo.findByGrade(grade);
  if (!slots.length) throw ApiError.notFound('No timetable slots found for this grade');
  for (const slot of slots) await rejectCollision(slot, slot._id.toString());
  const result = await repo.publishGrade(grade);
  await logAudit(`Published timetable for ${grade}`, 'Timetable', requester.id);
  return result;
}

export async function swapSlots(input: SwapSlotsInput, requester: AuthenticatedUser) {
  if (!canManageTimetable(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may rearrange periods');
  try {
    const slots = await repo.swapSlots(input);
    await logAudit(`Swapped timetable periods for ${input.grade}`, 'Timetable', requester.id);
    return slots;
  } catch (err) {
    const code = (err as Error & { code?: number | string }).code;
    if (code === 'SOURCE_NOT_FOUND') throw ApiError.notFound('Source timetable slot not found');
    if (code === 11000) throw ApiError.conflict('The teacher or room is already scheduled at the destination');
    throw err;
  }
}
