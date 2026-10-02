import mongoose, { FilterQuery } from 'mongoose';
import { TimetableSlot, ITimetableSlot } from '../../models/TimetableSlot';
import { ListSlotsQuery, CreateSlotInput, UpdateSlotInput, SwapSlotsInput } from './timetable.validation';

export function findMany(query: ListSlotsQuery, publishedOnly = false): Promise<ITimetableSlot[]> {
  const filter: FilterQuery<ITimetableSlot> = {};
  if (query.grade) filter.grade = query.grade;
  if (query.dayOfWeek) filter.dayOfWeek = query.dayOfWeek;
  if (publishedOnly) filter.status = 'Published';
  return TimetableSlot.find(filter).sort({ grade: 1, dayOfWeek: 1, periodNumber: 1 });
}

export function create(input: CreateSlotInput): Promise<ITimetableSlot> {
  return TimetableSlot.create(input);
}
export function findById(id: string): Promise<ITimetableSlot | null> {
  return TimetableSlot.findById(id);
}

export function update(id: string, input: UpdateSlotInput): Promise<ITimetableSlot | null> {
  return TimetableSlot.findByIdAndUpdate(id, { ...input, status: 'Draft' }, { new: true, runValidators: true });
}

export function remove(id: string): Promise<ITimetableSlot | null> {
  return TimetableSlot.findByIdAndDelete(id);
}

export function findCollision(
  dayOfWeek: ITimetableSlot['dayOfWeek'],
  periodNumber: number,
  teacherName: string,
  room?: string,
  excludeId?: string,
): Promise<ITimetableSlot | null> {
  const alternatives: FilterQuery<ITimetableSlot>[] = [{ teacherName }];
  if (room && room !== '—') alternatives.push({ room });
  const filter: FilterQuery<ITimetableSlot> = { dayOfWeek, periodNumber, $or: alternatives };
  if (excludeId) filter._id = { $ne: excludeId };
  return TimetableSlot.findOne(filter);
}

export function findByGrade(grade: string): Promise<ITimetableSlot[]> {
  return TimetableSlot.find({ grade });
}

export function publishGrade(grade: string) {
  return TimetableSlot.updateMany({ grade }, { $set: { status: 'Published' } });
}

export async function swapSlots(input: SwapSlotsInput): Promise<ITimetableSlot[]> {
  const session = await mongoose.startSession();
  try {
    let result: ITimetableSlot[] = [];
    await session.withTransaction(async () => {
      const [source, target] = await Promise.all([
        TimetableSlot.findOne({ grade: input.grade, ...input.source }).session(session),
        TimetableSlot.findOne({ grade: input.grade, ...input.target }).session(session),
      ]);
      if (!source) throw Object.assign(new Error('SOURCE_NOT_FOUND'), { code: 'SOURCE_NOT_FOUND' });

      const content = (slot: ITimetableSlot) => ({
        subject: slot.subject,
        teacherName: slot.teacherName,
        room: slot.room,
        isSubstitute: slot.isSubstitute,
      });
      const ids = [source._id];
      if (target) ids.push(target._id);
      await TimetableSlot.deleteMany({ _id: { $in: ids } }).session(session);

      const documents = [
        { grade: input.grade, ...input.target, ...content(source), status: 'Draft' as const },
      ];
      if (target) {
        documents.push({ grade: input.grade, ...input.source, ...content(target), status: 'Draft' as const });
      }
      result = await TimetableSlot.create(documents, { session, ordered: true });
    });
    return result;
  } finally {
    await session.endSession();
  }
}
