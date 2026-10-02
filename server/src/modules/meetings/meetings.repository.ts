import { FilterQuery, Types } from 'mongoose';
import { MeetingSlot, IMeetingSlot } from '../../models/MeetingSlot';
import { Student } from '../../models/Student';
import { ListSlotsQuery, CreateSlotInput } from './meetings.validation';

export async function findMany(query: ListSlotsQuery): Promise<{ items: IMeetingSlot[]; total: number }> {
  const filter: FilterQuery<IMeetingSlot> = {};
  if (query.onlyOpen) filter.status = 'Available';

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    MeetingSlot.find(filter)
      .sort({ date: 1, startTime: 1 })
      .skip(skip)
      .limit(query.limit)
      .populate('teacher', 'name refId department')
      .populate('bookedForStudent', 'name refId grade')
      .populate('bookedBy', 'name email')
      .populate('bookedGuardian', 'refId name'),
    MeetingSlot.countDocuments(filter),
  ]);
  return { items, total };
}

export function create(input: CreateSlotInput): Promise<IMeetingSlot> {
  return MeetingSlot.create({ teacher: input.teacherStaffId, date: new Date(input.date), startTime: input.startTime, room: input.room, note: input.note });
}

/**
 * Atomic claim applied to booking: the availability check (`status: 'Available'`)
 * and the claim are ONE findOneAndUpdate, so two parents racing for the same slot cannot both
 * win - the second finds the guard unsatisfied and gets null back. Returns the updated slot, or
 * null when the slot doesn't exist OR is already booked (the caller distinguishes via a
 * follow-up existence check only in the failure path, keeping the happy path single-query).
 */
export function claimSlotIfOpen(slotId: string, bookedBy: string, studentId: string) {
  return MeetingSlot.findOneAndUpdate(
    { _id: slotId, status: 'Available' },
    { $set: { bookedBy, bookedForStudent: studentId, status: 'Confirmed' } },
    { new: true },
  );
}

export function findById(id: string): Promise<IMeetingSlot | null> {
  return MeetingSlot.findById(id);
}

export function findStudentOwnedByGuardian(studentId: string, guardianUserId: string) {
  return Student.findOne({ _id: new Types.ObjectId(studentId), guardianUserId });
}
