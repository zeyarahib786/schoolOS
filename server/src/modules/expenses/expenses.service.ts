import { ApiError } from '../../utils/ApiError';
import { IExpenseClaim } from '../../models/ExpenseClaim';
import * as repo from './expenses.repository';
import { ListClaimsQuery, SubmitClaimInput, ReviewClaimInput } from './expenses.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeClaimFilter, canSubmitClaim, canReviewClaim } from './expenses.ownership';

export async function listClaims(query: ListClaimsQuery, requester: AuthenticatedUser) {
  const ownStaffId =
    requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Accountant'
      ? null
      : await repo.findOwnStaffId(requester.id);

  const { items, total } = await repo.findMany(query, (base) => scopeClaimFilter(base, requester, ownStaffId));
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function submitClaim(input: SubmitClaimInput, requester: AuthenticatedUser): Promise<IExpenseClaim> {
  if (!canSubmitClaim(requester.role)) throw ApiError.forbidden('This role cannot submit an expense claim');
  const ownStaffId = await repo.findOwnStaffId(requester.id);
  if (!ownStaffId)
    throw ApiError.badRequest(
      'No staff record is linked to your account - an expense claim must be tied to a staff record',
    );
  return repo.create(ownStaffId.toString(), input);
}

/**
 * Segregation of duties, enforced not just assumed: a reviewer with a finance role (e.g.
 * Accountant) is explicitly blocked from approving or rejecting THEIR OWN expense claim, even
 * though `canReviewClaim` alone would technically allow it. Holding a review-capable role is
 * necessary but not sufficient - self-approval is a real internal-controls gap this check exists
 * specifically to close, and it's tested directly (see expenses.ownership.test.ts).
 */
export async function reviewClaim(
  id: string,
  input: ReviewClaimInput,
  requester: AuthenticatedUser,
): Promise<IExpenseClaim> {
  if (!canReviewClaim(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Accountant may review an expense claim');

  const claim = await repo.findById(id);
  if (!claim) throw ApiError.notFound('Expense claim not found');
  if (claim.status !== 'Pending') throw ApiError.conflict('This claim has already been reviewed');

  const ownStaffId = await repo.findOwnStaffId(requester.id);
  if (ownStaffId && claim.staff.toString() === ownStaffId.toString()) {
    throw ApiError.forbidden('You cannot review your own expense claim');
  }

  const updated = await repo.review(id, input.status, requester.id, input.reviewNotes);
  if (!updated) throw ApiError.notFound('Expense claim not found');
  return updated;
}
