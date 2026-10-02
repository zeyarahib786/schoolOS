import { FilterQuery, Types } from 'mongoose';
import { ILoan } from '../../models/Loan';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role } from '../../types/roles';

const UNRESTRICTED_READ_ROLES: Role[] = ['Administrator', 'Principal', 'Teacher'];
const WRITE_ROLES_FOR_LIBRARY: Role[] = ['Administrator', 'Principal', 'Teacher'];

export function scopeLoanFilter(
  base: FilterQuery<ILoan>,
  requester: AuthenticatedUser,
  authorizedStudentIds: Types.ObjectId[],
): FilterQuery<ILoan> {
  if (UNRESTRICTED_READ_ROLES.includes(requester.role)) {
    return base;
  }
  return { ...base, student: { $in: authorizedStudentIds } };
}

export function canManageLibrary(role: Role): boolean {
  return WRITE_ROLES_FOR_LIBRARY.includes(role);
}
