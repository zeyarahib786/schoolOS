import { Types } from 'mongoose';
import { scopeVisitFilter, canRecordVisit } from '../../src/modules/health/health.ownership';
import { AuthenticatedUser } from '../../src/middleware/auth';

function makeUser(id: string, role: AuthenticatedUser['role']): AuthenticatedUser {
  return { id, role };
}

const childId = new Types.ObjectId();

describe('scopeVisitFilter', () => {
  it('leaves the filter unrestricted ONLY for Administrator and Principal - deliberately narrower than Behaviour, which also includes Teacher', () => {
    for (const role of ['Administrator', 'Principal'] as const) {
      expect(scopeVisitFilter({}, makeUser('any', role), [])).toEqual({});
    }
  });

  it('scopes a Teacher to their (empty, since Teachers are not guardians) authorized student list - a Teacher can RECORD a visit but cannot browse the clinic log afterward', () => {
    const filter = scopeVisitFilter({}, makeUser('teacher-id', 'Teacher'), []);
    expect(filter).toEqual({ student: { $in: [] } });
  });

  it("scopes a Parent to only their linked children's visits", () => {
    const filter = scopeVisitFilter({}, makeUser('parent-id', 'Parent'), [childId]);
    expect(filter).toEqual({ student: { $in: [childId] } });
  });
});

describe('canRecordVisit', () => {
  it('allows Administrator, Principal, AND Teacher to record a visit - broader than the read-access role list', () => {
    expect(canRecordVisit('Administrator')).toBe(true);
    expect(canRecordVisit('Principal')).toBe(true);
    expect(canRecordVisit('Teacher')).toBe(true);
  });

  it('denies Accountant, Parent, and Student from recording a visit', () => {
    expect(canRecordVisit('Accountant')).toBe(false);
    expect(canRecordVisit('Parent')).toBe(false);
    expect(canRecordVisit('Student')).toBe(false);
  });
});
