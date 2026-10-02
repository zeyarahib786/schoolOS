import { ApiError } from '../../utils/ApiError';
import { IAdmissionApplication } from '../../models/AdmissionApplication';
import * as repo from './admissions.repository';
import { ListApplicationsQuery, CreateApplicationInput, TransitionInput, EnrollInput } from './admissions.validation';
import { Role, WRITE_ROLES } from '../../types/roles';
import { canTransitionApplication, ApplicationStatus } from './admissions.state-machine';
import { requiredDocumentsPresent } from './admission-documents.service';
import { logAudit } from '../audit/audit.service';
import { AuthenticatedUser } from '../../middleware/auth';

function canManageAdmissions(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}

export async function listApplications(query: ListApplicationsQuery, role: Role) {
  if (!canManageAdmissions(role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may view admissions');
  const { items, total } = await repo.findMany(query);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function submitApplication(input: CreateApplicationInput, requester: AuthenticatedUser): Promise<IAdmissionApplication> {
  if (!canManageAdmissions(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may record an application');
  const application = await repo.create(input);
  await logAudit(`Created admission application for ${application.applicantName}`, 'Admissions', requester.id);
  return application;
}

export async function transition(id: string, input: TransitionInput, requester: AuthenticatedUser): Promise<IAdmissionApplication> {
  if (!canManageAdmissions(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may progress an application');
  const application = await repo.findById(id);
  if (!application) throw ApiError.notFound('Application not found');
  // Rejected remains terminal in the normal pipeline. The retained Admissions UI has an
  // explicit Restore action, so permit only its pre-acceptance recovery targets here.
  const isRejectedRestore = application.status === 'Rejected'
    && ['Applied', 'Shortlisted', 'Interviewed'].includes(input.status);
  if (!canTransitionApplication(application.status as ApplicationStatus, input.status) && !isRejectedRestore) {
    throw ApiError.badRequest(`Cannot move an application from ${application.status} to ${input.status}`);
  }
  if (input.status === 'Accepted' && !requiredDocumentsPresent(application)) throw ApiError.badRequest('Passport/ID, birth certificate, and photo must be received before an offer can be issued');
  const from = application.status;
  application.status = input.status;
  if (input.status === 'Waitlisted' || input.status === 'Rejected') application.previousStatus = from as IAdmissionApplication['previousStatus'];
  if ((from === 'Waitlisted' || from === 'Rejected') && input.status !== 'Rejected') application.previousStatus = undefined;
  if (input.status === 'Rejected') { application.decisionReason = input.reason; application.decisionOutcome = input.outcome || 'Rejected'; }
  application.history.unshift({ from, to: input.status, reason: input.reason, outcome: input.outcome, performedBy: requester.id as never, at: new Date() });
  await application.save();
  await logAudit(`${input.status === 'Rejected' ? (input.outcome || 'Rejected') : 'Moved'} admission application ${application.applicantName}: ${from} → ${input.status}`, 'Admissions', requester.id, input.status === 'Rejected' ? 'Warning' : 'Info');
  return application;
}

export async function enroll(id: string, input: EnrollInput, requester: AuthenticatedUser): Promise<IAdmissionApplication> {
  if (!canManageAdmissions(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may enroll an applicant');
  try {
    const application = await repo.findById(id);
    if (!application) throw ApiError.notFound('Application not found');
    if (!application.gender) throw ApiError.badRequest('Applicant gender must be recorded before enrolment');
    if (!requiredDocumentsPresent(application)) throw ApiError.badRequest('Passport/ID, birth certificate, and photo must be received before enrolment');
    const enrolled = await repo.enrollApplication(id, input, requester.id);
    await logAudit(`Enrolled admission application ${enrolled.applicantName} as student ${input.refId}`, 'Admissions', requester.id);
    return enrolled;
  } catch (err) {
    if (err instanceof Error) {
      const code = (err as Error & { code?: string | number }).code;
      if (code === 'APPLICATION_NOT_FOUND') throw ApiError.notFound('Application not found');
      if (code === 'NOT_ACCEPTED') throw ApiError.badRequest('Only an Accepted application can be enrolled');
      if (code === 11000) throw ApiError.conflict('A student with this refId already exists');
    }
    throw err;
  }
}
