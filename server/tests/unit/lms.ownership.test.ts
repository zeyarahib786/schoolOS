import { Types } from 'mongoose';
import { scopeSubmissionFilter, canManageAssignments, canSubmit } from '../../src/modules/lms/lms.ownership';
import { AuthenticatedUser } from '../../src/middleware/auth';

function makeUser(id: string, role: AuthenticatedUser['role']): AuthenticatedUser {
  return { id, role };
}

const ownStudentRecordId = new Types.ObjectId();

describe('scopeSubmissionFilter', () => {
  it('leaves the filter unrestricted for Administrator, Principal, and Teacher', () => {
    for (const role of ['Administrator', 'Principal', 'Teacher'] as const) {
      expect(scopeSubmissionFilter({}, makeUser('any', role), [])).toEqual({});
    }
  });

  it('scopes a Student to their own resolved student id (via studentUserId, resolved by the caller)', () => {
    const filter = scopeSubmissionFilter({}, makeUser('student-id', 'Student'), [ownStudentRecordId]);
    expect(filter).toEqual({ student: { $in: [ownStudentRecordId] } });
  });

  it("scopes a Parent to their linked children's ids (via guardianUserId, resolved by the caller) - same function, different relationship", () => {
    const childId = new Types.ObjectId();
    const filter = scopeSubmissionFilter({}, makeUser('parent-id', 'Parent'), [childId]);
    expect(filter).toEqual({ student: { $in: [childId] } });
  });
});

describe('canManageAssignments', () => {
  it('allows Administrator, Principal, and Teacher', () => {
    expect(canManageAssignments('Administrator')).toBe(true);
    expect(canManageAssignments('Principal')).toBe(true);
    expect(canManageAssignments('Teacher')).toBe(true);
  });

  it('denies Student and Parent from managing assignments', () => {
    expect(canManageAssignments('Student')).toBe(false);
    expect(canManageAssignments('Parent')).toBe(false);
  });
});

describe('canSubmit', () => {
  it("allows ONLY Student to submit - not even Administrator can submit on a student's behalf", () => {
    expect(canSubmit('Student')).toBe(true);
    expect(canSubmit('Administrator')).toBe(false);
    expect(canSubmit('Teacher')).toBe(false);
    expect(canSubmit('Parent')).toBe(false);
  });
});
