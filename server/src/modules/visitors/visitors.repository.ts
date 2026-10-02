import { FilterQuery } from 'mongoose';
import { VisitorLog, IVisitorLog } from '../../models/VisitorLog';
import { ListVisitorsQuery, CheckInInput } from './visitors.validation';

export async function findMany(query: ListVisitorsQuery): Promise<{ items: IVisitorLog[]; total: number }> {
  const filter: FilterQuery<IVisitorLog> = {};
  if (query.status) filter.status = query.status;

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    VisitorLog.find(filter)
      .sort({ checkedInAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('checkedInBy', 'name role'),
    VisitorLog.countDocuments(filter),
  ]);
  return { items, total };
}

export function findById(id: string): Promise<IVisitorLog | null> {
  return VisitorLog.findById(id);
}

export function checkIn(input: CheckInInput, checkedInBy: string): Promise<IVisitorLog> {
  return VisitorLog.create({ ...input, checkedInBy });
}

export function checkOut(id: string): Promise<IVisitorLog | null> {
  return VisitorLog.findOneAndUpdate(
    { _id: id, status: 'CheckedIn' },
    { status: 'CheckedOut', checkedOutAt: new Date() },
    { new: true },
  );
}
