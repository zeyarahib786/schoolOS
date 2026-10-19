import { FilterQuery } from 'mongoose';
import { HostelRoom, IHostelRoom } from '../../models/HostelRoom';
import { Student } from '../../models/Student';
import { CreateRoomInput, ListRoomsQuery } from './hostel.validation';

export function createRoom(input: CreateRoomInput): Promise<IHostelRoom> {
  return HostelRoom.create({ ...input, occupants: [] });
}

export async function findManyRooms(
  query: ListRoomsQuery,
  applyOwnershipScope: (base: FilterQuery<IHostelRoom>) => FilterQuery<IHostelRoom>,
): Promise<{ items: IHostelRoom[]; total: number }> {
  let filter: FilterQuery<IHostelRoom> = { archived: query.archived ? true : { $ne: true } };
  if (query.block) filter.block = query.block;
  filter = applyOwnershipScope(filter);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    HostelRoom.find(filter)
      .sort({ block: 1, roomNumber: 1 })
      .skip(skip)
      .limit(query.limit)
      .populate('occupants', 'name refId grade'),
    HostelRoom.countDocuments(filter),
  ]);
  return { items, total };
}

export function findRoomById(id: string): Promise<IHostelRoom | null> {
  return HostelRoom.findById(id);
}

/** Same atomic capacity-guard technique as Transport's seat assignment ($expr comparing array
 * size against capacity, $addToSet so re-allocating the same student is a no-op) - reused
 * deliberately since it's the correct, already-proven solution to the same underlying problem
 * (a fixed-capacity resource, many candidates competing for limited slots), not re-derived from
 * scratch for the sake of appearing novel. */
export function allocateIfCapacityAvailable(
  roomId: string,
  studentId: string,
  capacity: number,
): Promise<IHostelRoom | null> {
  return HostelRoom.findOneAndUpdate(
    { _id: roomId, $expr: { $lt: [{ $size: '$occupants' }, capacity] } },
    { $addToSet: { occupants: studentId } },
    { new: true },
  );
}

export function findAuthorizedStudentIds(userId: string, role: string) {
  return Student.find(
    role === 'Student'
      ? { studentUserId: userId }
      : role === 'Parent'
        ? { guardianUserId: userId }
        : { _id: { $in: [] } },
  )
    .select('_id')
    .then((students) => students.map((s) => s._id));
}
