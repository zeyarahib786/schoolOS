import { FilterQuery } from 'mongoose';
import { ApiError } from '../../utils/ApiError';
import { IStaff } from '../../models/Staff';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role } from '../../types/roles';

/** Roles with unrestricted read access to the full staff directory - Administrator/Principal
 * genuinely need this (org-wide HR visibility); Accountant needs it for payroll; Teacher does
 * NOT get blanket staff-directory access here, unlike Students where Teacher is unrestricted -
 * a teacher having full read access to every colleague's HR record (salary-adjacent fields,
 * leave status) is a materially different sensitivity level than a teacher seeing student
 * rosters, so this deliberately does not just copy student.ownership.ts's role list. */
const UNRESTRICTED_READ_ROLES: Role[] = ['Administrator', 'Principal', 'Accountant'];

/** A Teacher (or any other linked role) may only see their OWN staff record via this scope -
 * self-service access to their own HR record (e.g. viewing their own leave balance later),
 * not their colleagues'. */
export function scopeStaffFilter(base: FilterQuery<IStaff>, requester: AuthenticatedUser): FilterQuery<IStaff> {
  if (UNRESTRICTED_READ_ROLES.includes(requester.role)) {
    return base;
  }
  return { ...base, userId: requester.id };
}

export function assertCanReadStaff(staff: IStaff, requester: AuthenticatedUser): void {
  if (UNRESTRICTED_READ_ROLES.includes(requester.role)) return;
  if (staff.userId?.toString() === requester.id) return;
  throw ApiError.notFound('Staff record not found');
}
