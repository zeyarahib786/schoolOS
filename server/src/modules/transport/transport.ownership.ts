import { FilterQuery, Types } from 'mongoose';
import { IRoute } from '../../models/Route';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role, WRITE_ROLES } from '../../types/roles';

const UNRESTRICTED_READ_ROLES: Role[] = ['Administrator', 'Principal', 'Teacher'];

/** A Parent is scoped to routes their OWN linked child is assigned to - a direct array-contains
 * match on `assignedStudents`, not a two-step resolve-then-scope the way Payroll/Expenses/Fees
 * needed, since the relationship lives directly on Route rather than requiring a lookup through
 * an intermediate collection. */
export function scopeRouteFilter(
  base: FilterQuery<IRoute>,
  requester: AuthenticatedUser,
  authorizedStudentIds: Types.ObjectId[],
): FilterQuery<IRoute> {
  if (UNRESTRICTED_READ_ROLES.includes(requester.role)) {
    return base;
  }
  return { ...base, assignedStudents: { $in: authorizedStudentIds } };
}

export function canManageTransport(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}
