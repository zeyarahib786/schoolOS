import { MeetingSlot } from '../../models/MeetingSlot';
import { Guardian } from '../../models/Guardian';

export function findGuardianWithStudent(guardianId: string, studentId: string) {
  return Guardian.findOne({ _id: guardianId, studentIds: studentId });
}

export function bookOnBehalf(slotId: string, guardianId: string, studentId: string, note?: string) {
  return MeetingSlot.findOneAndUpdate(
    { _id: slotId, status: 'Available' },
    {
      $set: {
        bookedGuardian: guardianId,
        bookedForStudent: studentId,
        status: 'Confirmed',
        note,
        link: `https://meet.alnoor.ae/${slotId}`,
      },
    },
    { new: true },
  );
}

export function confirm(slotId: string) {
  return MeetingSlot.findOneAndUpdate({ _id: slotId, status: 'Pending' }, { $set: { status: 'Confirmed' } }, { new: true });
}

export function cancel(slotId: string) {
  return MeetingSlot.findOneAndUpdate(
    { _id: slotId, status: { $ne: 'Available' } },
    { $set: { status: 'Available', bookedBy: null, bookedGuardian: null, bookedForStudent: null, link: null }, $unset: { note: 1 } },
    { new: true },
  );
}

export async function reschedule(sourceId: string, targetId: string) {
  const session = await MeetingSlot.startSession();
  let moved;
  try {
    await session.withTransaction(async () => {
      const source = await MeetingSlot.findOne({ _id: sourceId, status: { $ne: 'Available' } }).session(session);
      if (!source) return;
      const target = await MeetingSlot.findOneAndUpdate(
        { _id: targetId, status: 'Available', teacher: source.teacher },
        { $set: {
          bookedBy: source.bookedBy || null,
          bookedGuardian: source.bookedGuardian || null,
          bookedForStudent: source.bookedForStudent || null,
          status: 'Confirmed',
          note: source.note,
          link: `https://meet.alnoor.ae/${targetId}`,
        } },
        { new: true, session },
      );
      if (!target) return;
      await MeetingSlot.updateOne(
        { _id: sourceId },
        { $set: { status: 'Available', bookedBy: null, bookedGuardian: null, bookedForStudent: null, link: null }, $unset: { note: 1 } },
        { session },
      );
      moved = target;
    });
    return moved;
  } finally {
    await session.endSession();
  }
}

