import { ApiError } from '../../utils/ApiError';
import { BehaviourIncident, IBehaviourIncident } from '../../models/BehaviourIncident';
import { Student } from '../../models/Student';
import { User } from '../../models/User';
import * as repo from './behaviour.repository';
import { ListIncidentsQuery, CreateIncidentInput, UpdateIncidentInput } from './behaviour.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeIncidentFilter, canLogIncident } from './behaviour.ownership';
import { calendarDate, schoolToday } from '../attendance/attendance.dates';
import { getSettings } from '../settings/settings.repository';
import { logAudit } from '../audit/audit.service';
function office(user: AuthenticatedUser) {
  return ['Administrator', 'Principal'].includes(user.role);
}
export async function listIncidents(query: ListIncidentsQuery, requester: AuthenticatedUser) {
  const ids = canLogIncident(requester.role) ? [] : await repo.findAuthorizedStudentIds(requester.id, requester.role);
  const { items, total } = await repo.findMany(query, (base) => scopeIncidentFilter(base, requester, ids));
  const visible = canLogIncident(requester.role)
    ? items
    : items.map((r) => {
        const value = r.toObject();
        delete value.witness;
        delete value.assignedTo;
        return { ...value, history: [] };
      });
  return {
    items: visible,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}
export async function logIncident(
  input: CreateIncidentInput,
  requester: AuthenticatedUser,
): Promise<IBehaviourIncident> {
  if (!canLogIncident(requester.role)) throw ApiError.forbidden('Only school staff may log behaviour entries');
  const student = await Student.findById(input.studentId);
  if (!student) throw ApiError.notFound('Student not found');
  if (student.status !== 'Active') throw ApiError.conflict('Behaviour entries require an active student');
  const today = await schoolToday(),
    incidentDate = input.incidentDate || today;
  if (incidentDate > today) throw ApiError.badRequest('Entry date cannot be in the future');
  if (!office(requester) && incidentDate !== today) throw ApiError.forbidden('Only the office may backdate entries');
  if (input.followUpDate && input.followUpDate < incidentDate)
    throw ApiError.badRequest('Follow-up cannot precede the entry');
  const row = await repo.create({ ...input, incidentDate }, requester.id);
  await logAudit('Logged behaviour entry ' + row._id, 'Behaviour', requester.id);
  return row;
}
export async function updateIncidentStatus(id: string, input: UpdateIncidentInput, requester: AuthenticatedUser) {
  if (!canLogIncident(requester.role)) throw ApiError.forbidden('Only school staff may update behaviour entries');
  const current = await BehaviourIncident.findById(id);
  if (!current) throw ApiError.notFound('Behaviour entry not found');
  if (!office(requester) && String(current.reportedBy) !== requester.id)
    throw ApiError.forbidden('Teachers may update only their own entries');
  if (
    !office(requester) &&
    (current.status === 'Escalated' || current.status === 'Closed' || input.status === 'Logged')
  )
    throw ApiError.forbidden('The school office must review escalated or closed entries');
  if (current.type === 'Merit') throw ApiError.conflict('Merit awards are recorded as closed entries');
  if (current.updatedAt.toISOString() !== input.expectedUpdatedAt)
    throw ApiError.conflict('Behaviour entry changed; refresh before saving');
  const settings = await getSettings(),
    day = current.incidentDate || calendarDate(current.createdAt, settings.timezone);
  if (input.followUpDate && input.followUpDate < day) throw ApiError.badRequest('Follow-up cannot precede the entry');
  if (input.status === 'Closed' && !input.actionTaken?.trim())
    throw ApiError.badRequest('A recorded resolution is required to close a case');
  if (input.assignedToEmail !== undefined && !office(requester))
    throw ApiError.forbidden('Only the office may assign follow-up ownership');
  const assignee = input.assignedToEmail
    ? await User.findOne({
        email: input.assignedToEmail.toLowerCase(),
        isActive: true,
        role: { $in: ['Administrator', 'Principal', 'Teacher'] },
      }).select('_id')
    : null;
  if (input.assignedToEmail && !assignee) throw ApiError.badRequest('Follow-up owner must be an active staff account');
  const set: Record<string, unknown> = { status: input.status };
  if (input.actionTaken !== undefined) set.actionTaken = input.actionTaken;
  if (input.followUpDate && input.status !== 'Closed') set.followUpDate = input.followUpDate;
  if (input.assignedToEmail) set.assignedTo = assignee!._id;
  const unset: Record<string, 1> = {};
  if (input.followUpDate === null || input.status === 'Closed') unset.followUpDate = 1;
  if (input.assignedToEmail === null) unset.assignedTo = 1;
  const row = await BehaviourIncident.findOneAndUpdate(
    { _id: id, updatedAt: new Date(input.expectedUpdatedAt) },
    {
      $set: set,
      ...(Object.keys(unset).length ? { $unset: unset } : {}),
      $push: {
        history: {
          changedAt: new Date(),
          changedBy: requester.id,
          from: current.status,
          to: input.status,
          reason: input.reason,
          actionTaken: input.actionTaken,
        },
      },
    },
    { new: true, runValidators: true },
  )
    .populate('student', 'name refId grade')
    .populate('reportedBy', 'name role')
    .populate('assignedTo', 'name role email');
  if (!row) throw ApiError.conflict('Behaviour entry changed; refresh before saving');
  await logAudit('Updated behaviour entry ' + id + ' to ' + input.status, 'Behaviour', requester.id);
  return row;
}
