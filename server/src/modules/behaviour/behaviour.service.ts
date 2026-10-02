import { ApiError } from '../../utils/ApiError';
import { IBehaviourIncident } from '../../models/BehaviourIncident';
import * as repo from './behaviour.repository';
import { ListIncidentsQuery, CreateIncidentInput } from './behaviour.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeIncidentFilter, canLogIncident } from './behaviour.ownership';

export async function listIncidents(query: ListIncidentsQuery, requester: AuthenticatedUser) {
  const authorizedStudentIds =
    requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Teacher'
      ? []
      : await repo.findAuthorizedStudentIds(requester.id);

  const { items, total } = await repo.findMany(query, (base) =>
    scopeIncidentFilter(base, requester, authorizedStudentIds),
  );
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function logIncident(
  input: CreateIncidentInput,
  requester: AuthenticatedUser,
): Promise<IBehaviourIncident> {
  if (!canLogIncident(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may log a behaviour incident');
  return repo.create(input, requester.id);
}

export async function updateIncidentStatus(id: string, status: 'Escalated' | 'Closed', requester: AuthenticatedUser) {
  if (!canLogIncident(requester.role)) throw ApiError.forbidden('Only Administrator, Principal, or Teacher may update a behaviour entry');
  const incident = await repo.updateStatus(id, status);
  if (!incident) throw ApiError.notFound('Behaviour entry not found');
  return incident;
}
