import { ApiError } from '../../utils/ApiError';
import { IAnnouncement } from '../../models/Announcement';
import * as repo from './announcements.repository';
import { ListAnnouncementsQuery, CreateAnnouncementInput, ChangeAnnouncementStatusInput } from './announcements.validation';
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

export async function changeStatus(id: string, input: ChangeAnnouncementStatusInput, requester: AuthenticatedUser): Promise<IAnnouncement> {
  const announcement = await repo.findById(id);
  if (!announcement) throw ApiError.notFound('Announcement not found');
  const reviewer = requester.role === 'Administrator' || requester.role === 'Principal';
  if (input.status === 'Pending approval') {
    if (!reviewer && announcement.publishedBy.toString() !== requester.id)
      throw ApiError.forbidden('Only the author or a reviewer can submit this draft');
    if (announcement.status !== 'Draft') throw ApiError.conflict('Only a draft can be submitted for approval');
  } else {
    if (!reviewer) throw ApiError.forbidden('Only Administrator or Principal can review announcements');
    if (announcement.status !== 'Pending approval') throw ApiError.conflict('Only a pending announcement can be reviewed');
  }
  const updated = await repo.transition(id, announcement.status, input.status);
  if (!updated) throw ApiError.conflict('Announcement status changed; refresh and try again');
  await logAudit(`Changed announcement ${id} from ${announcement.status} to ${input.status}`, 'Communication', requester.id);
  return updated;
}
