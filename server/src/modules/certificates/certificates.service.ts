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
  const student = await Student.findById(input.studentId).select('_id');
  if (!student) throw ApiError.notFound('Student not found');
  const certificate = await repo.issue(input, requester.id);
  await logAudit(
    `${input.status === 'Pending' ? 'Requested' : 'Issued'} ${input.type} certificate for ${student.refId}`,
    'Certificates', requester.id,
  );
  return certificate;
}

export async function decideCertificate(
  id: string, decision: 'Issued' | 'Rejected', requester: AuthenticatedUser,
): Promise<ICertificate> {
  if (requester.role !== 'Administrator' && requester.role !== 'Principal') {
    throw ApiError.forbidden('Only Administrator or Principal may decide certificate requests');
  }
  const current = await repo.findById(id);
  if (!current) throw ApiError.notFound('Certificate request not found');
  if (current.status !== 'Pending') throw ApiError.conflict('Only pending certificate requests can be decided');
  const certificate = await repo.decide(id, decision, requester.id, current.type);
  if (!certificate) throw ApiError.conflict('Certificate request was already decided');
  await logAudit(`${decision === 'Issued' ? 'Approved' : 'Rejected'} ${current.type} certificate request`, 'Certificates', requester.id);
  return certificate;
}
