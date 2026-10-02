import { Types } from 'mongoose';
import { scopeLeaveFilter, canDecideLeave } from '../../src/modules/leave/leave.ownership';
import { AuthenticatedUser } from '../../src/middleware/auth';

function makeUser(id: string, role: AuthenticatedUser['role']): AuthenticatedUser {
  return { id, role };
}

describe('canDecideLeave', () => {
  it('allows ONLY Administrator and Principal - a strict SUBSET of WRITE_ROLES; a Teacher can request but never approve', () => {
    expect(canDecideLeave('Administrator')).toBe(true);
    expect(canDecideLeave('Principal')).toBe(true);
    expect(canDecideLeave('Teacher')).toBe(false);
    expect(canDecideLeave('Accountant')).toBe(false);
    expect(canDecideLeave('Parent')).toBe(false);
    expect(canDecideLeave('Student')).toBe(false);
  });
});

describe('scopeLeaveFilter', () => {
  it('leaves the filter unrestricted for approver roles', () => {
    expect(scopeLeaveFilter({}, makeUser('any', 'Administrator'), null)).toEqual({});
    expect(scopeLeaveFilter({}, makeUser('any', 'Principal'), null)).toEqual({});
  });

  it('scopes a Teacher to their own staff record', () => {
    const ownId = new Types.ObjectId();
    expect(scopeLeaveFilter({}, makeUser('teacher', 'Teacher'), ownId)).toEqual({ staff: ownId });
  });

  it('a non-approver with NO linked staff record matches nothing rather than everything - fail closed', () => {
    const filter = scopeLeaveFilter({}, makeUser('teacher', 'Teacher'), null);
    expect(filter.staff).toBeDefined();
    expect(String(filter.staff)).toBe('000000000000000000000000');
  });
});
