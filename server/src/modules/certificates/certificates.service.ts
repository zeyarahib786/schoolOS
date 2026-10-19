import { Certificate } from '../../models/Certificate';
import { ApiError } from '../../utils/ApiError';
import { ICertificate } from '../../models/Certificate';
import * as repo from './certificates.repository';
import { ListCertificatesQuery, IssueCertificateInput } from './certificates.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { Student } from '../../models/Student';
import { scopeCertificateFilter, canIssueCertificates } from './certificates.ownership';
import { logAudit } from '../audit/audit.service';

export async function listCertificates(query: ListCertificatesQuery, requester: AuthenticatedUser) {
  const authorizedStudentIds =
    requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Teacher'
      ? []
      : await repo.findAuthorizedStudentIds(requester.id, requester.role);

  const { items, total } = await repo.findMany(query, (base) =>
    scopeCertificateFilter(base, requester, authorizedStudentIds),
  );
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function issueCertificate(
  input: IssueCertificateInput,
  requester: AuthenticatedUser,
): Promise<ICertificate> {
  if (!canIssueCertificates(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may issue a certificate');
  const student = await Student.findById(input.studentId).select('_id refId');
  if (!student) throw ApiError.notFound('Student not found');
  const certificate =
    input.status === 'Pending'
      ? await repo.createPendingRequest(input, requester.id)
      : await repo.issue(input, requester.id);
  if (!certificate) throw ApiError.conflict('Certificate request could not be saved');
  await logAudit(
    `${input.status === 'Pending' ? 'Requested' : 'Issued'} ${input.type} certificate for ${student.refId}`,
    'Certificates',
    requester.id,
  );
  return certificate;
}

export async function decideCertificate(
  id: string,
  decision: 'Issued' | 'Rejected',
  requester: AuthenticatedUser,
  expectedUpdatedAt?: string,
  reason?: string,
): Promise<ICertificate> {
  if (requester.role !== 'Administrator' && requester.role !== 'Principal') {
    throw ApiError.forbidden('Only Administrator or Principal may decide certificate requests');
  }
  const current = await repo.findById(id);
  if (!current) throw ApiError.notFound('Certificate request not found');
  if (current.status !== 'Pending') throw ApiError.conflict('Only pending certificate requests can be decided');
  const certificate = await repo.decide(id, decision, requester.id, current.type, expectedUpdatedAt, reason);
  if (!certificate) throw ApiError.conflict('Certificate request was already decided');
  await logAudit(
    `${decision === 'Issued' ? 'Approved' : 'Rejected'} ${current.type} certificate request`,
    'Certificates',
    requester.id,
  );
  return certificate;
}

export async function requestCertificate(input: Omit<IssueCertificateInput, 'status'>, requester: AuthenticatedUser) {
  if (!['Parent', 'Student'].includes(requester.role)) throw ApiError.forbidden('Family request account required');
  const ids = await repo.findAuthorizedStudentIds(requester.id, requester.role);
  if (!ids.some((id) => id.toString() === input.studentId))
    throw ApiError.forbidden('Only a linked student can be requested');
  const saved = await repo.createPendingRequest({ ...input, status: 'Pending' }, requester.id, requester.role);
  await logAudit('Requested ' + input.type + ' certificate', 'Certificates', requester.id);
  return saved;
}
export async function listRequests(requester: AuthenticatedUser) {
  if (canIssueCertificates(requester.role))
    return Certificate.find({ requestedBy: { $exists: true } })
      .sort({ createdAt: -1 })
      .populate('student', 'name refId grade');
  const ids = await repo.findAuthorizedStudentIds(requester.id, requester.role);
  return Certificate.find({ requestedBy: requester.id, student: { $in: ids } })
    .sort({ createdAt: -1 })
    .populate('student', 'name refId grade');
}
export async function cancelRequest(
  id: string,
  input: { expectedUpdatedAt: string; reason: string },
  requester: AuthenticatedUser,
) {
  if (!['Parent', 'Student'].includes(requester.role))
    throw ApiError.forbidden('Only the family submitter can cancel this request');
  const ids = await repo.findAuthorizedStudentIds(requester.id, requester.role);
  const saved = await Certificate.findOneAndUpdate(
    {
      _id: id,
      requestedBy: requester.id,
      student: { $in: ids },
      status: 'Pending',
      updatedAt: new Date(input.expectedUpdatedAt),
    },
    { $set: { status: 'Cancelled', decisionReason: input.reason, decisionBy: requester.id, decisionAt: new Date() } },
    { new: true },
  );
  if (!saved) throw ApiError.conflict('Own pending request changed or was already decided');
  await logAudit('Cancelled own certificate request ' + id, 'Certificates', requester.id);
  return saved;
}
