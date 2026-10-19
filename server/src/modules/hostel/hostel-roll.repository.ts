import { HostelRollCall, HostelRollStatus } from '../../models/HostelRollCall';
import { HostelRoom } from '../../models/HostelRoom';
import { Types } from 'mongoose';

export function list(date: string) {
  return HostelRollCall.find({ date }).sort({ updatedAt: -1 }).populate('student', 'name refId grade');
}

export function isBoarder(studentId: string) {
  return HostelRoom.exists({ occupants: studentId });
}

export function upsert(studentId: string, date: string, status: HostelRollStatus, markedBy: string) {
  return HostelRollCall.findOneAndUpdate(
    { student: studentId, date },
    { $set: { status, markedBy } },
    { new: true, upsert: true, runValidators: true },
  ).populate('student', 'name refId grade');
}

export async function markAllPresent(date: string, markedBy: string) {
  const rooms = await HostelRoom.find({}).select('occupants');
  const ids = [...new Set(rooms.flatMap((room) => room.occupants.map(String)))];
  if (!ids.length) return [];
  const onLeave = await HostelRollCall.find({ date, student: { $in: ids }, status: 'On leave' }).distinct('student');
  const onLeaveIds = new Set(onLeave.map(String));
  await HostelRollCall.bulkWrite(
    ids
      .filter((student) => !onLeaveIds.has(student))
      .map((student) => ({
        updateOne: {
          filter: { student: new Types.ObjectId(student), date },
          update: { $set: { status: 'Present', markedBy: new Types.ObjectId(markedBy) } },
          upsert: true,
        },
      })),
  );
  return list(date);
}
