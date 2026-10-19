import { ApiError } from '../../utils/ApiError';
import { ClinicVisit, IClinicVisit } from '../../models/ClinicVisit';
import * as repo from './health.repository';
import { ListVisitsQuery, CreateVisitInput, UpdateVisitInput } from './health.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeVisitFilter, canRecordVisit } from './health.ownership';
import { calendarDate, schoolToday } from '../attendance/attendance.dates';
import { getSettings } from '../settings/settings.repository';
import { logAudit } from '../audit/audit.service';

export async function listVisits(query: ListVisitsQuery, requester: AuthenticatedUser) {
  const authorizedStudentIds =
    requester.role === 'Administrator' || requester.role === 'Principal'
      ? []
      : await repo.findAuthorizedStudentIds(requester.id, requester.role);

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
  const today = await schoolToday(),
    visitDate = input.visitDate || today;
  if (visitDate > today) throw ApiError.badRequest('Clinic visit cannot be in the future');
  if (requester.role === 'Teacher' && visitDate !== today)
    throw ApiError.forbidden('Only the school office may backdate a clinic visit');
  if (input.followUpDate && input.followUpDate < visitDate)
    throw ApiError.badRequest('Follow-up cannot precede the visit');
  const visit = await repo.create({ ...input, visitDate }, requester.id);
  await logAudit(`Recorded clinic visit ${visit._id} for ${student.refId}`, 'Health', requester.id);
  return visit;
}

export async function updateVisit(id: string, input: UpdateVisitInput, requester: AuthenticatedUser) {
  if (requester.role !== 'Administrator' && requester.role !== 'Principal')
    throw ApiError.forbidden('Only Administrator or Principal may update a clinic record');
  const current = await ClinicVisit.findById(id);
  if (!current) throw ApiError.notFound('Clinic visit not found');
  if (current.updatedAt.toISOString() !== input.expectedUpdatedAt)
    throw ApiError.conflict('Clinic record changed; refresh before saving');
  const settings = await getSettings(),
    visitDate = current.visitDate || calendarDate(current.createdAt, settings.timezone);
  if (input.followUpDate && input.followUpDate < visitDate)
    throw ApiError.badRequest('Follow-up cannot precede the visit');
  const { expectedUpdatedAt, reason, followUpDate, ...fields } = input;
  const changes: Record<string, unknown> = { ...fields };
  if (followUpDate) changes.followUpDate = followUpDate;
  if (input.parentContacted === true && !current.parentContacted) changes.parentContactedAt = new Date();
  const unset: Record<string, 1> = {};
  if (followUpDate === null) unset.followUpDate = 1;
  if (input.parentContacted === false) unset.parentContactedAt = 1;
  const visit = await ClinicVisit.findOneAndUpdate(
    { _id: id, updatedAt: new Date(expectedUpdatedAt) },
    {
      $set: changes,
      ...(Object.keys(unset).length ? { $unset: unset } : {}),
      $push: {
        history: {
          changedAt: new Date(),
          changedBy: requester.id,
          reason,
          previousOutcome: current.outcome,
          outcome: input.outcome || current.outcome,
          parentContacted: input.parentContacted ?? current.parentContacted,
          followUpDate: followUpDate === null ? undefined : followUpDate || current.followUpDate,
        },
      },
    },
    { new: true, runValidators: true },
  )
    .populate('student', 'name refId grade')
    .populate('recordedBy', 'name role');
  if (!visit) throw ApiError.conflict('Clinic record changed; refresh before saving');
  await logAudit(`Updated clinic visit ${id}`, 'Health', requester.id);
  return visit;
}
