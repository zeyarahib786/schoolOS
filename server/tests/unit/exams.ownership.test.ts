import { Types } from 'mongoose';
import { scopeResultFilter, canManageExams } from '../../src/modules/exams/exams.ownership';
import { AuthenticatedUser } from '../../src/middleware/auth';

function makeUser(id: string, role: AuthenticatedUser['role']): AuthenticatedUser {
  return { id, role };
}

const childId = new Types.ObjectId();

describe('scopeResultFilter', () => {
  it('leaves the filter unrestricted for Administrator, Principal, and Teacher', () => {
    for (const role of ['Administrator', 'Principal', 'Teacher'] as const) {
      expect(scopeResultFilter({ exam: 'exam-1' }, makeUser('any', role), [])).toEqual({ exam: 'exam-1' });
    }
  });

  it('scopes Accountant to their (empty) authorized student list - no business need for exam results', () => {
    const filter = scopeResultFilter({}, makeUser('acct-id', 'Accountant'), []);
    expect(filter).toEqual({ student: { $in: [] } });
  });

  it("scopes a Parent to only their linked children's results", () => {
    const filter = scopeResultFilter({}, makeUser('parent-id', 'Parent'), [childId]);
    expect(filter).toEqual({ student: { $in: [childId] } });
  });
});

describe('canManageExams', () => {
  it('allows Administrator, Principal, and Teacher to manage exams and results', () => {
    expect(canManageExams('Administrator')).toBe(true);
    expect(canManageExams('Principal')).toBe(true);
    expect(canManageExams('Teacher')).toBe(true);
  });

  it('denies Accountant, Parent, and Student', () => {
    expect(canManageExams('Accountant')).toBe(false);
    expect(canManageExams('Parent')).toBe(false);
    expect(canManageExams('Student')).toBe(false);
  });
});
