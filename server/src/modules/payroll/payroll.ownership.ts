import { FilterQuery, Types } from 'mongoose';
import { IPayslip } from '../../models/Payslip';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role } from '../../types/roles';

/** Same read-access shape as Fees (Administrator/Principal/Accountant) - payroll is financial
 * data, Teacher has no broader visibility here than any other staff member would for HR data. */
const UNRESTRICTED_READ_ROLES: Role[] = ['Administrator', 'Principal', 'Accountant'];
const WRITE_ROLES_FOR_PAYROLL: Role[] = ['Administrator', 'Principal', 'Accountant'];

/** Any non-unrestricted role (most relevantly: a Teacher) is scoped to payslips for THEIR OWN
 * linked staff record only - real self-service, matching the pattern already proven for Staff's
 * own self-scoping. Takes the already-resolved staff id as a parameter, same separation-of-
 * concerns as every prior ownership function that needs a DB lookup first. */
export function scopePayslipFilter(
  base: FilterQuery<IPayslip>,
  requester: AuthenticatedUser,
  ownStaffId: Types.ObjectId | null,
): FilterQuery<IPayslip> {
  if (UNRESTRICTED_READ_ROLES.includes(requester.role)) {
    return base;
  }
  if (!ownStaffId) {
    return { ...base, _id: { $in: [] } };
  }
  return { ...base, staff: ownStaffId };
}

export function canManagePayroll(role: Role): boolean {
  return WRITE_ROLES_FOR_PAYROLL.includes(role);
}
