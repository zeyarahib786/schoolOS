import { Types } from 'mongoose';
import { scopeClaimFilter, canSubmitClaim, canReviewClaim } from '../../src/modules/expenses/expenses.ownership';
import { AuthenticatedUser } from '../../src/middleware/auth';

function makeUser(id: string, role: AuthenticatedUser['role']): AuthenticatedUser {
  return { id, role };
}

const ownStaffId = new Types.ObjectId();

describe('scopeClaimFilter', () => {
  it('leaves the filter unrestricted for Administrator, Principal, and Accountant', () => {
    for (const role of ['Administrator', 'Principal', 'Accountant'] as const) {
      expect(scopeClaimFilter({ status: 'Pending' }, makeUser('any', role), null)).toEqual({ status: 'Pending' });
    }
  });

  it('scopes a Teacher to only their own submitted claims', () => {
    const filter = scopeClaimFilter({}, makeUser('teacher-id', 'Teacher'), ownStaffId);
    expect(filter).toEqual({ staff: ownStaffId });
  });

  it('scopes a Teacher with no linked staff record to match nothing', () => {
    const filter = scopeClaimFilter({}, makeUser('teacher-id', 'Teacher'), null);
    expect(filter).toEqual({ _id: { $in: [] } });
  });
});

describe('canSubmitClaim', () => {
  it('allows Administrator, Principal, Teacher, and Accountant to submit their own claim', () => {
    expect(canSubmitClaim('Administrator')).toBe(true);
    expect(canSubmitClaim('Principal')).toBe(true);
    expect(canSubmitClaim('Teacher')).toBe(true);
    expect(canSubmitClaim('Accountant')).toBe(true);
  });

  it('denies Parent and Student, who have no staff link at all', () => {
    expect(canSubmitClaim('Parent')).toBe(false);
    expect(canSubmitClaim('Student')).toBe(false);
  });
});

describe('canReviewClaim', () => {
  it('allows Administrator, Principal, and Accountant to review claims', () => {
    expect(canReviewClaim('Administrator')).toBe(true);
    expect(canReviewClaim('Principal')).toBe(true);
    expect(canReviewClaim('Accountant')).toBe(true);
  });

  it('denies Teacher from reviewing claims - Teacher can only submit, never approve', () => {
    expect(canReviewClaim('Teacher')).toBe(false);
  });
});
