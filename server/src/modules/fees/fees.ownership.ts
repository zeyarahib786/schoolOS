import { FilterQuery, Types } from 'mongoose';
import { IInvoice } from '../../models/Invoice';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role } from '../../types/roles';

/** Financial records - deliberately the narrowest read-access role list of any module built so
 * far. A Teacher has no legitimate business need to see fee/payment data (unlike Students or
 * Attendance, where Teacher is unrestricted), so Teacher is excluded here even though it's
 * always included elsewhere. Administrator/Principal for oversight, Accountant because this is
 * literally their job. */
const UNRESTRICTED_READ_ROLES: Role[] = ['Administrator', 'Principal', 'Accountant'];

/** Same write-role set as read here - unlike Students/Staff/Attendance where the write-role set
 * is a subset of WRITE_ROLES (Administrator/Principal/Teacher), Fees write access is
 * Administrator/Principal/ACCOUNTANT - Accountant can create invoices and record payments,
 * Teacher cannot. This is the first module where the write-role list doesn't match
 * WRITE_ROLES from types/roles.ts at all - worth being explicit about, not silently inconsistent. */
const WRITE_ROLES_FOR_FEES: Role[] = ['Administrator', 'Principal', 'Accountant'];

export function scopeInvoiceFilter(
  base: FilterQuery<IInvoice>,
  requester: AuthenticatedUser,
  authorizedStudentIds: Types.ObjectId[],
): FilterQuery<IInvoice> {
  if (UNRESTRICTED_READ_ROLES.includes(requester.role)) {
    return base;
  }
  return { ...base, student: { $in: authorizedStudentIds } };
}

export function canManageFees(role: Role): boolean {
  return WRITE_ROLES_FOR_FEES.includes(role);
}
