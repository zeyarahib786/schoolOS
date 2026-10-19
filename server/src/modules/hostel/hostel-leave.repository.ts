import { FilterQuery, Types } from 'mongoose';
import { HostelLeave, HostelLeaveStatus, IHostelLeave } from '../../models/HostelLeave';

export function create(studentId: string, roomId: string, type: string, fromDate: Date, toDate: Date, reason: string) {
  return HostelLeave.create({ student: studentId, room: roomId, type, fromDate, toDate, reason });
}

export async function list(filter: FilterQuery<IHostelLeave>, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    HostelLeave.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('student', 'name refId grade')
      .populate('room', 'roomNumber block')
      .populate('approvedBy', 'name'),
    HostelLeave.countDocuments(filter),
  ]);
  return { items, total };
}

export function findAllocatedRoom(studentId: string, roomId: string) {
  return import('../../models/HostelRoom').then(({ HostelRoom }) =>
    HostelRoom.findOne({ _id: roomId, occupants: new Types.ObjectId(studentId) }),
  );
}

export function transition(id: string, from: HostelLeaveStatus[], status: HostelLeaveStatus, approvedBy?: string) {
  const update: { status: HostelLeaveStatus; approvedBy?: string } = { status };
  if (approvedBy) update.approvedBy = approvedBy;
  return HostelLeave.findOneAndUpdate({ _id: id, status: { $in: from } }, { $set: update }, { new: true })
    .populate('student', 'name refId grade')
    .populate('room', 'roomNumber block')
    .populate('approvedBy', 'name');
}
