import { FilterQuery, Types } from 'mongoose';
import { IHostelRoom } from '../../models/HostelRoom';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role, WRITE_ROLES } from '../../types/roles';

const UNRESTRICTED_READ_ROLES: Role[] = ['Administrator', 'Principal', 'Teacher'];

/** Same direct array-contains scoping shape as Transport's routes - a Parent sees only rooms
 * their own linked child actually occupies. */
export function scopeRoomFilter(
  base: FilterQuery<IHostelRoom>,
  requester: AuthenticatedUser,
  authorizedStudentIds: Types.ObjectId[],
): FilterQuery<IHostelRoom> {
  if (UNRESTRICTED_READ_ROLES.includes(requester.role)) {
    return base;
  }
  return { ...base, occupants: { $in: authorizedStudentIds } };
}

export function canManageHostel(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}
