import { FilterQuery, Types } from 'mongoose';
import { IExpenseClaim } from '../../models/ExpenseClaim';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role } from '../../types/roles';

const UNRESTRICTED_READ_ROLES: Role[] = ['Administrator', 'Principal', 'Accountant'];
const REVIEW_ROLES: Role[] = ['Administrator', 'Principal', 'Accountant'];

/** Any staff-linked role (Administrator/Principal/Teacher/Accountant - anyone who could plausibly
 * be a staff member submitting their own expense) may SUBMIT a claim, but only for themselves -
 * there's no "submit on behalf of a colleague" endpoint. Parent/Student have no staff link and
 * can't submit at all. */
const SUBMIT_ROLES: Role[] = ['Administrator', 'Principal', 'Teacher', 'Accountant'];

export function scopeClaimFilter(
  base: FilterQuery<IExpenseClaim>,
  requester: AuthenticatedUser,
  ownStaffId: Types.ObjectId | null,
): FilterQuery<IExpenseClaim> {
  if (UNRESTRICTED_READ_ROLES.includes(requester.role)) {
    return base;
  }
  if (!ownStaffId || requester.role !== 'Teacher') {
    return { ...base, _id: { $in: [] } };
  }
  return { ...base, staff: ownStaffId };
}

export function canSubmitClaim(role: Role): boolean {
  return SUBMIT_ROLES.includes(role);
}

export function canReviewClaim(role: Role): boolean {
  return REVIEW_ROLES.includes(role);
}
