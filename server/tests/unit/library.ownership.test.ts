import { Types } from 'mongoose';
import { scopeLoanFilter, canManageLibrary } from '../../src/modules/library/library.ownership';
import { AuthenticatedUser } from '../../src/middleware/auth';

function makeUser(id: string, role: AuthenticatedUser['role']): AuthenticatedUser {
  return { id, role };
}

const childId = new Types.ObjectId();

describe('scopeLoanFilter', () => {
  it('leaves the filter unrestricted for Administrator, Principal, and Teacher', () => {
    for (const role of ['Administrator', 'Principal', 'Teacher'] as const) {
      expect(scopeLoanFilter({ status: 'Active' }, makeUser('any', role), [])).toEqual({ status: 'Active' });
    }
  });

  it("scopes a Parent to only their linked children's loans", () => {
    const filter = scopeLoanFilter({}, makeUser('parent-id', 'Parent'), [childId]);
    expect(filter).toEqual({ student: { $in: [childId] } });
  });
});

describe('canManageLibrary', () => {
  it('allows Administrator, Principal, and Teacher to manage the library', () => {
    expect(canManageLibrary('Administrator')).toBe(true);
    expect(canManageLibrary('Principal')).toBe(true);
    expect(canManageLibrary('Teacher')).toBe(true);
  });

  it('denies Accountant, Parent, and Student', () => {
    expect(canManageLibrary('Accountant')).toBe(false);
    expect(canManageLibrary('Parent')).toBe(false);
    expect(canManageLibrary('Student')).toBe(false);
  });
});
