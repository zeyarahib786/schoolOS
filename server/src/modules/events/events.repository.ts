import { FilterQuery } from 'mongoose';
import { AuthenticatedUser } from '../../middleware/auth';
import { Event, IEvent } from '../../models/Event';
import { ListEventsQuery } from './events.validation';

export async function findMany(
  query: ListEventsQuery,
  requester: AuthenticatedUser,
): Promise<{ items: IEvent[]; total: number }> {
  const filters: FilterQuery<IEvent>[] = [];
  if (query.audience) filters.push({ audience: query.audience });
  if (requester.role === 'Parent') filters.push({ audience: { $in: ['All', 'Parents', 'Students'] } });
  if (requester.role === 'Student') filters.push({ audience: { $in: ['All', 'Students'] } });
  if (query.status)
    filters.push(query.status === 'Scheduled' ? { status: { $ne: 'Cancelled' } } : { status: 'Cancelled' });
  if (query.dateFrom || query.dateTo)
    filters.push({
      date: {
        ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {}),
      },
    });
  const filter: FilterQuery<IEvent> = filters.length ? { $and: filters } : {};
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Event.find(filter)
      .sort({ date: 1 })
      .skip(skip)
      .limit(query.limit)
      .populate({
        path: 'booking',
        select: 'facility startTime endTime status',
        populate: { path: 'facility', select: 'name' },
      })
      .populate('createdBy', 'name'),
    Event.countDocuments(filter),
  ]);
  return { items, total };
}

export function create(data: {
  title: string;
  description: string;
  date: Date;
  audience: string;
  createdBy: string;
  bookingId?: string;
}): Promise<IEvent> {
  return Event.create({
    title: data.title,
    description: data.description,
    date: data.date,
    audience: data.audience,
    createdBy: data.createdBy,
    booking: data.bookingId,
  });
}
