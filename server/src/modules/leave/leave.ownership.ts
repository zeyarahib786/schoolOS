import { FilterQuery, Types } from 'mongoose';
import { ILeaveRequest } from '../../models/LeaveRequest';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role } from '../../types/roles';

/** Approval is a MANAGEMENT function: Administrator and Principal only - deliberately NARROWER
 * than WRITE_ROLES. A Teacher can request their own leave but cannot approve anyone's, including
 * their own; this is the first module whose write-side gate is a strict subset of WRITE_ROLES
 * rather than WRITE_ROLES itself. */
const APPROVER_ROLES: Role[] = ['Administrator', 'Principal'];

export function canDecideLeave(role: Role): boolean {
  return APPROVER_ROLES.includes(role);
}

/** Approvers see all requests; everyone else sees only their own (via their linked Staff record,
 * resolved by the caller through Staff.userId - the same self-service shape as Payroll and
 * Expenses). */
export function scopeLeaveFilter(
  base: FilterQuery<ILeaveRequest>,
  requester: AuthenticatedUser,
  ownStaffId: Types.ObjectId | null,
): FilterQuery<ILeaveRequest> {
  if (canDecideLeave(requester.role)) return base;
  if (!['Teacher', 'Accountant'].includes(requester.role)) return { ...base, _id: { $in: [] } };
  return { ...base, staff: ownStaffId ?? new Types.ObjectId('000000000000000000000000') };
}
