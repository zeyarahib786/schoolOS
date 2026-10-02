import { FilterQuery, Types } from 'mongoose';
import { ICafeteriaWallet } from '../../models/CafeteriaWallet';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role } from '../../types/roles';

/** Same read-access shape as Fees/Payroll (financial data) - Administrator/Principal/Accountant
 * unrestricted, Teacher excluded. Cafeteria balances are money, the same sensitivity category as
 * fee invoices, not an academic or behavioural record. */
const UNRESTRICTED_READ_ROLES: Role[] = ['Administrator', 'Principal', 'Accountant'];
const CAN_MANAGE_ROLES: Role[] = ['Administrator', 'Principal', 'Accountant'];

export function scopeWalletFilter(
  base: FilterQuery<ICafeteriaWallet>,
  requester: AuthenticatedUser,
  authorizedStudentIds: Types.ObjectId[],
): FilterQuery<ICafeteriaWallet> {
  if (UNRESTRICTED_READ_ROLES.includes(requester.role)) {
    return base;
  }
  return { ...base, student: { $in: authorizedStudentIds } };
}

export function canManageWallet(role: Role): boolean {
  return CAN_MANAGE_ROLES.includes(role);
}
