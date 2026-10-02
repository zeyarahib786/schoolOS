import { FilterQuery, Types } from 'mongoose';
import { ICertificate } from '../../models/Certificate';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role } from '../../types/roles';

const UNRESTRICTED_READ_ROLES: Role[] = ['Administrator', 'Principal', 'Teacher'];
const WRITE_ROLES_FOR_CERTIFICATES: Role[] = ['Administrator', 'Principal', 'Teacher'];

export function scopeCertificateFilter(
  base: FilterQuery<ICertificate>,
  requester: AuthenticatedUser,
  authorizedStudentIds: Types.ObjectId[],
): FilterQuery<ICertificate> {
  if (UNRESTRICTED_READ_ROLES.includes(requester.role)) {
    return base;
  }
  if (base.status === 'Pending' || base.status === 'Rejected') {
    return { ...base, student: { $in: [] } };
  }
  return {
    ...base,
    student: { $in: authorizedStudentIds },
    $or: [{ status: 'Issued' }, { status: { $exists: false } }],
  };
}

export function canIssueCertificates(role: Role): boolean {
  return WRITE_ROLES_FOR_CERTIFICATES.includes(role);
}
