import { ApiError } from '../../utils/ApiError';
import { IClinicVisit } from '../../models/ClinicVisit';
import * as repo from './health.repository';
import { ListVisitsQuery, CreateVisitInput, UpdateVisitInput } from './health.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeVisitFilter, canRecordVisit } from './health.ownership';
import { logAudit } from '../audit/audit.service';

export async function listVisits(query: ListVisitsQuery, requester: AuthenticatedUser) {
  const authorizedStudentIds =
    requester.role === 'Administrator' || requester.role === 'Principal'
      ? []
      : await repo.findAuthorizedStudentIds(requester.id);

  const { items, total } = await repo.findMany(query, (base) =>
    scopeVisitFilter(base, requester, authorizedStudentIds),
  );
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function recordVisit(input: CreateVisitInput, requester: AuthenticatedUser): Promise<IClinicVisit> {
  if (!canRecordVisit(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may record a clinic visit');
  const student = await repo.findStudentById(input.studentId);
  if (!student) throw ApiError.notFound('Student not found');
  if (student.status !== 'Active') throw ApiError.conflict('A clinic visit can only be recorded for an active student');
  const visit = await repo.create(input, requester.id);
  await logAudit(`Recorded clinic visit for ${student.refId}: ${input.reason}`, 'Health', requester.id);
  return visit;
}

export async function updateVisit(id: string, input: UpdateVisitInput, requester: AuthenticatedUser) {
  if (requester.role !== 'Administrator' && requester.role !== 'Principal')
    throw ApiError.forbidden('Only Administrator or Principal may update a clinic record');
  const visit = await repo.update(id, input);
  if (!visit) throw ApiError.notFound('Clinic visit not found');
  await logAudit(`Updated clinic visit ${id}`, 'Health', requester.id);
  return visit;
}
