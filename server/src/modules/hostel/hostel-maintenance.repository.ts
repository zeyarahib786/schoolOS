import { HostelMaintenance } from '../../models/HostelMaintenance';
import { HostelRoom } from '../../models/HostelRoom';

const populated = 'room reportedBy resolvedBy';

export function roomExists(roomId: string) {
  return HostelRoom.exists({ _id: roomId });
}

export function create(input: { refId: string; roomId: string; issue: string; category: string; priority: string }, reportedBy: string) {
  return HostelMaintenance.create({ ...input, room: input.roomId, reportedBy }).then((request) => request.populate(populated));
}

export async function list(page: number, limit: number, status?: string) {
  const filter = status ? { status } : {};
  const [items, total] = await Promise.all([
    HostelMaintenance.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate(populated),
    HostelMaintenance.countDocuments(filter),
  ]);
  return { items, total };
}

export function resolve(id: string, resolvedBy: string) {
  return HostelMaintenance.findOneAndUpdate(
    { _id: id, status: { $ne: 'Resolved' } },
    { $set: { status: 'Resolved', resolvedBy, resolvedAt: new Date() } },
    { new: true },
  ).populate(populated);
}
