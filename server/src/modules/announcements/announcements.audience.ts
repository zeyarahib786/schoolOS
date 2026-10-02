import { Role } from '../../types/roles';

export type Audience = 'All' | 'Staff' | 'Parents' | 'Students';

/** Pure role -> visible-audience-set mapping. Staff roles see EVERYTHING (including
 * Parents/Students-targeted announcements - staff need to know what's been communicated to whom);
 * a Parent sees All + Parents; a Student sees All + Students. Accountant counts as staff for
 * visibility purposes - they work at the school and need internal announcements - even though
 * Accountant is not in WRITE_ROLES and can't publish. */
const STAFF_ROLES: Role[] = ['Administrator', 'Principal', 'Teacher', 'Accountant'];

export function visibleAudiencesFor(role: Role): Audience[] {
  if (STAFF_ROLES.includes(role)) return ['All', 'Staff', 'Parents', 'Students'];
  if (role === 'Parent') return ['All', 'Parents'];
  return ['All', 'Students'];
}
