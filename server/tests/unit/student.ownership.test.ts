import { Types } from 'mongoose';
import { scopeStudentFilter, assertCanReadStudent } from '../../src/modules/students/student.ownership';
import { IStudent } from '../../src/models/Student';
import { AuthenticatedUser } from '../../src/middleware/auth';
import { ApiError } from '../../src/utils/ApiError';

function makeUser(id: string, role: AuthenticatedUser['role']): AuthenticatedUser {
  return { id, role };
}

function makeStudent(guardianUserId?: string, studentUserId?: string): IStudent {
  return {
    guardianUserId: guardianUserId ? new Types.ObjectId(guardianUserId) : undefined,
    studentUserId: studentUserId ? new Types.ObjectId(studentUserId) : undefined,
  } as IStudent;
}

const parentAId = '64b7f9c9a1b2c3d4e5f60001';
const parentBId = '64b7f9c9a1b2c3d4e5f60002';

describe('scopeStudentFilter (list/search ownership scoping)', () => {
  it('leaves the filter unrestricted for Administrator', () => {
    const filter = scopeStudentFilter({ grade: 'Grade 5' }, makeUser('any', 'Administrator'));
    expect(filter).toEqual({ grade: 'Grade 5' });
  });

  it('leaves the filter unrestricted for Principal, Teacher, and Accountant', () => {
    for (const role of ['Principal', 'Teacher', 'Accountant'] as const) {
      const filter = scopeStudentFilter({}, makeUser('any', role));
      expect(filter).toEqual({});
    }
  });

  it('narrows the filter to guardianUserId for a Parent', () => {
    const filter = scopeStudentFilter({ status: 'Active' }, makeUser(parentAId, 'Parent'));
    expect(filter).toEqual({ status: 'Active', guardianUserId: parentAId });
  });

  it('never lets a Parent-provided filter override their own guardianUserId scope', () => {
    // Even if a caller tried to smuggle a different guardianUserId into the base filter,
    // the ownership scope is applied AFTER and wins - this is the actual IDOR-prevention behavior.
    const filter = scopeStudentFilter({ guardianUserId: parentBId }, makeUser(parentAId, 'Parent'));
    expect(filter.guardianUserId).toBe(parentAId);
  });

  it('scopes Student searches to the authenticated linked record only', () => {
    const filter = scopeStudentFilter({ studentUserId: parentBId }, makeUser(parentAId, 'Student'));
    expect(filter).toEqual({ studentUserId: parentAId });
  });
});

describe('assertCanReadStudent (single-record ownership check)', () => {
  it('allows Administrator to read any student', () => {
    expect(() => assertCanReadStudent(makeStudent(parentBId), makeUser(parentAId, 'Administrator'))).not.toThrow();
  });

  it('allows a Parent to read their own linked student', () => {
    expect(() => assertCanReadStudent(makeStudent(parentAId), makeUser(parentAId, 'Parent'))).not.toThrow();
  });

  it('rejects a Parent reading a student linked to a different guardian, with a 404 (not 403)', () => {
    let caught: unknown;
    try {
      assertCanReadStudent(makeStudent(parentBId), makeUser(parentAId, 'Parent'));
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).statusCode).toBe(404);
    // Deliberately NOT 403 - a 403 would confirm to the requester that the record exists,
    // which is itself an information leak for a record they have no right to know about.
  });

  it('rejects a Parent reading a student with no guardianUserId linked at all', () => {
    expect(() => assertCanReadStudent(makeStudent(undefined), makeUser(parentAId, 'Parent'))).toThrow(ApiError);
  });

  it('allows only the linked Student account to read its own record', () => {
    expect(() => assertCanReadStudent(makeStudent(undefined, parentAId), makeUser(parentAId, 'Student'))).not.toThrow();
    expect(() => assertCanReadStudent(makeStudent(undefined, parentBId), makeUser(parentAId, 'Student'))).toThrow(ApiError);
    expect(() => assertCanReadStudent(makeStudent(undefined), makeUser(parentAId, 'Student'))).toThrow(ApiError);
  });
});
