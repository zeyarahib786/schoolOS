import { FilterQuery, Types } from 'mongoose';
import { IBehaviourIncident } from '../../models/BehaviourIncident';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role, WRITE_ROLES } from '../../types/roles';

const UNRESTRICTED_READ_ROLES: Role[] = ['Administrator', 'Principal', 'Teacher'];

/** Same Student.guardianUserId-resolved scoping shape as Attendance/Fees/Exams - behaviour
 * records are sensitive enough that a Parent should only ever see their own child's, never a
 * classmate's, which is exactly the pattern already proven correct across three prior modules. */
export function scopeIncidentFilter(
  base: FilterQuery<IBehaviourIncident>,
  requester: AuthenticatedUser,
  authorizedStudentIds: Types.ObjectId[],
): FilterQuery<IBehaviourIncident> {
  if (UNRESTRICTED_READ_ROLES.includes(requester.role)) {
    return base;
  }
  return { ...base, student: { $in: authorizedStudentIds } };
}

export function canLogIncident(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}
