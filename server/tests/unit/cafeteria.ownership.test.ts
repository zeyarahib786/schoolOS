import { Types } from 'mongoose';
import { scopeWalletFilter, canManageWallet } from '../../src/modules/cafeteria/cafeteria.ownership';
import { AuthenticatedUser } from '../../src/middleware/auth';

function makeUser(id: string, role: AuthenticatedUser['role']): AuthenticatedUser {
  return { id, role };
}

const childId = new Types.ObjectId();

describe('scopeWalletFilter', () => {
  it('leaves the filter unrestricted for Administrator, Principal, and Accountant', () => {
    for (const role of ['Administrator', 'Principal', 'Accountant'] as const) {
      expect(scopeWalletFilter({}, makeUser('any', role), [])).toEqual({});
    }
  });

  it('scopes Teacher to their (empty) authorized student list - money data, no Teacher visibility, matching Fees/Payroll', () => {
    const filter = scopeWalletFilter({}, makeUser('teacher-id', 'Teacher'), []);
    expect(filter).toEqual({ student: { $in: [] } });
  });

  it("scopes a Parent to only their linked children's wallets", () => {
    const filter = scopeWalletFilter({}, makeUser('parent-id', 'Parent'), [childId]);
    expect(filter).toEqual({ student: { $in: [childId] } });
  });
});

describe('canManageWallet', () => {
  it('allows Administrator, Principal, and Accountant to manage wallets', () => {
    expect(canManageWallet('Administrator')).toBe(true);
    expect(canManageWallet('Principal')).toBe(true);
    expect(canManageWallet('Accountant')).toBe(true);
  });

  it('denies Teacher, Parent, and Student', () => {
    expect(canManageWallet('Teacher')).toBe(false);
    expect(canManageWallet('Parent')).toBe(false);
    expect(canManageWallet('Student')).toBe(false);
  });
});
