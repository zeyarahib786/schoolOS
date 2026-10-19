import { ExpenseClaim } from '../../models/ExpenseClaim';
import { schoolToday } from '../attendance/attendance.dates';
import { logAudit } from '../audit/audit.service';
import { z } from 'zod';
import { payClaimSchema, cancelClaimSchema } from './expenses.validation';
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
  if (input.expenseDate > (await schoolToday())) throw ApiError.badRequest('Expense date cannot be in the future');
  const saved = await repo.create(ownStaffId.toString(), input, requester.id);
  await logAudit('Submitted expense claim ' + saved._id, 'Expenses', requester.id);
  return saved;
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
  if (
    claim.submittedBy?.toString() === requester.id ||
    (ownStaffId && claim.staff.toString() === ownStaffId.toString())
  ) {
    throw ApiError.forbidden('You cannot review your own expense claim');
  }

  const updated = await ExpenseClaim.findOneAndUpdate(
    { _id: id, status: 'Pending', updatedAt: new Date(input.expectedUpdatedAt) },
    {
      $set: { status: input.status, reviewedBy: requester.id, reviewNotes: input.reviewNotes },
      $push: { history: { at: new Date(), by: requester.id, action: input.status, reason: input.reviewNotes } },
    },
    { new: true, runValidators: true },
  );
  if (!updated) throw ApiError.conflict('Claim changed; reload before reviewing');
  await logAudit(input.status + ' expense claim ' + id, 'Expenses', requester.id);
  return updated;
}

export async function payClaim(
  id: string,
  input: z.infer<typeof payClaimSchema>['body'],
  requester: AuthenticatedUser,
) {
  if (!canReviewClaim(requester.role)) throw ApiError.forbidden('Finance role required');
  if (input.paidDate > (await schoolToday())) throw ApiError.badRequest('Payment date cannot be in the future');
  const saved = await ExpenseClaim.findOneAndUpdate(
    { _id: id, status: 'Approved', updatedAt: new Date(input.expectedUpdatedAt) },
    {
      $set: {
        status: 'Paid',
        paidDate: new Date(input.paidDate),
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference,
      },
      $push: { history: { at: new Date(), by: requester.id, action: 'Paid', reason: input.reason } },
    },
    { new: true, runValidators: true },
  );
  if (!saved) throw ApiError.conflict('Only the current approved claim can be marked paid');
  await logAudit('Recorded reimbursement for claim ' + id, 'Expenses', requester.id);
  return saved;
}
export async function cancelClaim(
  id: string,
  input: z.infer<typeof cancelClaimSchema>['body'],
  requester: AuthenticatedUser,
) {
  const current = await repo.findById(id);
  if (!current) throw ApiError.notFound('Expense claim not found');
  const ownStaff = await repo.findOwnStaffId(requester.id);
  if (
    !canSubmitClaim(requester.role) ||
    !(current.submittedBy?.toString() === requester.id || current.staff.toString() === ownStaff?.toString())
  )
    throw ApiError.forbidden('Only the submitter can cancel a pending claim');
  const saved = await ExpenseClaim.findOneAndUpdate(
    { _id: id, status: 'Pending', updatedAt: new Date(input.expectedUpdatedAt) },
    {
      $set: { status: 'Cancelled' },
      $push: { history: { at: new Date(), by: requester.id, action: 'Cancelled', reason: input.reason } },
    },
    { new: true },
  );
  if (!saved) throw ApiError.conflict('Claim changed or was already reviewed');
  await logAudit('Cancelled expense claim ' + id, 'Expenses', requester.id);
  return saved;
}
