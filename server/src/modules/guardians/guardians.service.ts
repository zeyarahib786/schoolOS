import { AuthenticatedUser } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { logAudit } from '../audit/audit.service';
import * as repo from './guardians.repository';
import { ListBroadcastsQuery, ListGuardiansQuery, SendBroadcastInput } from './guardians.validation';

export async function listGuardians(query: ListGuardiansQuery) {
  const { items, total } = await repo.findMany(query);
  return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function setPortalStatus(id: string, status: 'Active' | 'Suspended', user: AuthenticatedUser) {
  const guardian = await repo.updatePortal(id, status);
  if (!guardian) throw ApiError.notFound('Guardian not found');
  await logAudit(`${status === 'Active' ? 'Activated' : 'Suspended'} guardian portal ${guardian.refId}`, 'Parents', user.id, status === 'Suspended' ? 'Warning' : 'Info');
  return guardian;
}

export async function sendBroadcast(input: SendBroadcastInput, user: AuthenticatedUser) {
  if (input.channel !== 'In-app only')
    throw ApiError.badRequest('Email and SMS delivery are not configured; choose In-app only');
  const targets = await repo.findBroadcastTargets(input);
  if (!targets.length) throw ApiError.badRequest('No guardians match that audience');
  const target = input.audience === 'Individual guardian' ? targets[0] : undefined;
  const audienceLabel = input.audience + (input.grade ? ` - ${input.grade}` : '') +
    (input.className ? ` - ${input.className}` : '') + (target ? ` - ${target.name}` : '');
  const broadcast = await repo.createBroadcast(input, audienceLabel, targets.map((guardian) => guardian._id), user.id);
  await logAudit(`Sent parent broadcast "${input.subject}" to ${targets.length} guardian${targets.length === 1 ? '' : 's'}`, 'Communication', user.id);
  return broadcast;
}

export async function listBroadcasts(query: ListBroadcastsQuery) {
  const { items, total } = await repo.listBroadcasts(query);
  return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function listMessages(id: string) {
  if (!(await repo.findById(id))) throw ApiError.notFound('Guardian not found');
  return repo.listMessages(id);
}

export async function sendMessage(id: string, text: string, user: AuthenticatedUser) {
  const guardian = await repo.findById(id);
  if (!guardian) throw ApiError.notFound('Guardian not found');
  const message = await repo.createMessage(id, text, user.id, `You - ${user.role}`);
  await logAudit(`Replied to guardian thread - ${guardian.refId}`, 'Communication', user.id);
  return message;
}
