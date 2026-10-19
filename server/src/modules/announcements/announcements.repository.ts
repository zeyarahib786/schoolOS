import { Announcement, IAnnouncement } from '../../models/Announcement';
import { ListAnnouncementsQuery, CreateAnnouncementInput } from './announcements.validation';
import { Audience } from './announcements.audience';
import { AuthenticatedUser } from '../../middleware/auth';
import { FilterQuery } from 'mongoose';

export async function findMany(
  query: ListAnnouncementsQuery,
  visibleAudiences: Audience[],
  requester: AuthenticatedUser,
): Promise<{ items: IAnnouncement[]; total: number }> {
  const filter: FilterQuery<IAnnouncement> = { audience: { $in: visibleAudiences } };
  if (requester.role !== 'Administrator' && requester.role !== 'Principal') {
    filter.$or = [{ status: 'Published' }, { status: { $exists: false } }];
    if (requester.role === 'Teacher') filter.$or.push({ publishedBy: requester.id });
  }
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Announcement.find(filter)
      .sort({ pinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('publishedBy', 'name role'),
    Announcement.countDocuments(filter),
  ]);
  return { items, total };
}

export function create(input: CreateAnnouncementInput, publishedBy: string): Promise<IAnnouncement> {
  return Announcement.create({ ...input, publishedBy });
}

export function findById(id: string): Promise<IAnnouncement | null> {
  return Announcement.findById(id).exec();
}

export function transition(
  id: string,
  from: IAnnouncement['status'],
  to: IAnnouncement['status'],
): Promise<IAnnouncement | null> {
  return Announcement.findOneAndUpdate({ _id: id, status: from }, { $set: { status: to } }, { new: true }).exec();
}
