import { Announcement } from '../../models/Announcement';
import { User } from '../../models/User';
import { Guardian } from '../../models/Guardian';
import { UpdateAnnouncementInput } from './announcements.validation';
import { ApiError } from '../../utils/ApiError';
import { IAnnouncement } from '../../models/Announcement';
import * as repo from './announcements.repository';
import {
  ListAnnouncementsQuery,
  CreateAnnouncementInput,
  ChangeAnnouncementStatusInput,
} from './announcements.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role, WRITE_ROLES } from '../../types/roles';
import { visibleAudiencesFor } from './announcements.audience';
import { logAudit } from '../audit/audit.service';

function canPublish(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}

export async function listAnnouncements(query: ListAnnouncementsQuery, requester: AuthenticatedUser) {
  const { items, total } = await repo.findMany(query, visibleAudiencesFor(requester.role), requester);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function publish(input: CreateAnnouncementInput, requester: AuthenticatedUser): Promise<IAnnouncement> {
  if (!canPublish(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may publish an announcement');
  if (input.status === 'Published' && requester.role === 'Teacher')
    throw ApiError.forbidden('Teacher announcements require reviewer approval');
  const created = await repo.create(input, requester.id);
  await logAudit(`Created announcement ${created.id} as ${created.status}`, 'Communication', requester.id);
  return created;
}

export async function changeStatus(
  id: string,
  input: ChangeAnnouncementStatusInput,
  requester: AuthenticatedUser,
): Promise<IAnnouncement> {
  const announcement = await repo.findById(id);
  if (!announcement) throw ApiError.notFound('Announcement not found');
  const reviewer = requester.role === 'Administrator' || requester.role === 'Principal';
  if (input.status === 'Pending approval') {
    if (!reviewer && announcement.publishedBy.toString() !== requester.id)
      throw ApiError.forbidden('Only the author or a reviewer can submit this draft');
    if (announcement.status !== 'Draft') throw ApiError.conflict('Only a draft can be submitted for approval');
  } else {
    if (!reviewer) throw ApiError.forbidden('Only Administrator or Principal can review announcements');
    if (announcement.status !== 'Pending approval')
      throw ApiError.conflict('Only a pending announcement can be reviewed');
  }
  const updated = await Announcement.findOneAndUpdate(
    {
      _id: id,
      status: announcement.status,
      ...(input.expectedUpdatedAt ? { updatedAt: new Date(input.expectedUpdatedAt) } : {}),
    },
    { $set: { status: input.status, reviewNote: input.reviewNote || '' } },
    { new: true },
  );
  if (!updated) throw ApiError.conflict('Announcement status changed; refresh and try again');
  await logAudit(
    `Changed announcement ${id} from ${announcement.status} to ${input.status}`,
    'Communication',
    requester.id,
  );
  return updated;
}

export async function updateAnnouncement(id: string, input: UpdateAnnouncementInput, requester: AuthenticatedUser) {
  const reviewer = ['Administrator', 'Principal'].includes(requester.role);
  const { expectedUpdatedAt, ...changes } = input;
  const row = await Announcement.findOneAndUpdate(
    {
      _id: id,
      status: 'Draft',
      updatedAt: new Date(expectedUpdatedAt),
      ...(!reviewer ? { publishedBy: requester.id } : {}),
    },
    { $set: changes },
    { new: true, runValidators: true },
  );
  if (!row) throw ApiError.conflict('Draft changed or is not editable by this user. Reload before saving');
  await logAudit(`Edited announcement ${row.title}`, 'Communication', requester.id);
  return row;
}
export async function previewAudience(audience: IAnnouncement['audience'], requester: AuthenticatedUser) {
  if (!canPublish(requester.role)) throw ApiError.forbidden('Only announcement authors may preview audiences');
  const suspended = await Guardian.find({ portalStatus: 'Suspended', userId: { $ne: null } }).select('userId');
  const roles =
    audience === 'All'
      ? ['Administrator', 'Principal', 'Teacher', 'Accountant', 'Parent', 'Student']
      : [
          'Administrator',
          'Principal',
          'Teacher',
          'Accountant',
          ...(audience === 'Parents' ? ['Parent'] : audience === 'Students' ? ['Student'] : []),
        ];
  const items = await User.aggregate<{ _id: string; count: number }>([
    { $match: { isActive: true, role: { $in: roles }, _id: { $nin: suspended.map((g) => g.userId) } } },
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);
  return {
    audience,
    visibleAccounts: items.reduce((n, r) => n + r.count, 0),
    byRole: items.map((r) => ({ role: r._id, count: r.count })),
    channel: 'In-app notice',
    deliveryTracked: false,
  };
}
