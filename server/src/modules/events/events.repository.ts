import { Event, IEvent } from '../../models/Event';
import { ListEventsQuery } from './events.validation';

export async function findMany(query: ListEventsQuery): Promise<{ items: IEvent[]; total: number }> {
  const filter = query.audience ? { audience: query.audience } : {};
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Event.find(filter)
      .sort({ date: 1 })
      .skip(skip)
      .limit(query.limit)
      .populate('booking', 'facility startTime endTime')
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
