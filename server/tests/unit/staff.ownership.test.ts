import { scopeStaffFilter, assertCanReadStaff } from '../../src/modules/staff/staff.ownership';
import { IStaff } from '../../src/models/Staff';
import { AuthenticatedUser } from '../../src/middleware/auth';
import { ApiError } from '../../src/utils/ApiError';

function makeUser(id: string, role: AuthenticatedUser['role']): AuthenticatedUser {
  return { id, role };
}

function makeStaff(userId?: string): IStaff {
  return { userId } as unknown as IStaff;
}

const teacherAId = 'teacher-a-id';
const teacherBId = 'teacher-b-id';

describe('scopeStaffFilter', () => {
  it('leaves the filter unrestricted for Administrator, Principal, and Accountant', () => {
    for (const role of ['Administrator', 'Principal', 'Accountant'] as const) {
      expect(scopeStaffFilter({ department: 'Science' }, makeUser('any', role))).toEqual({ department: 'Science' });
    }
  });

  it('scopes a Teacher to only their own linked staff record - NOT the full directory', () => {
    // Deliberately different from student.ownership.ts, where Teacher has unrestricted read
    // access to the student roster - a teacher should not have blanket read access to every
    // colleague's HR record just because they can see every student's academic record.
    const filter = scopeStaffFilter({}, makeUser(teacherAId, 'Teacher'));
    expect(filter).toEqual({ userId: teacherAId });
  });

  it('never lets a Teacher-supplied filter override their own scope', () => {
    const filter = scopeStaffFilter({ userId: teacherBId }, makeUser(teacherAId, 'Teacher'));
    expect(filter.userId).toBe(teacherAId);
  });

  it('scopes Parent and Student roles (no plausible reason to see any staff record) to their own linked record too, matching nothing if unlinked', () => {
    const filter = scopeStaffFilter({}, makeUser('some-parent-id', 'Parent'));
    expect(filter).toEqual({ userId: 'some-parent-id' });
  });
});

describe('assertCanReadStaff', () => {
  it('allows Administrator/Principal/Accountant to read any staff record', () => {
    for (const role of ['Administrator', 'Principal', 'Accountant'] as const) {
      expect(() => assertCanReadStaff(makeStaff(teacherBId), makeUser(teacherAId, role))).not.toThrow();
    }
  });

  it('allows a Teacher to read their own linked staff record', () => {
    expect(() => assertCanReadStaff(makeStaff(teacherAId), makeUser(teacherAId, 'Teacher'))).not.toThrow();
  });

  it("rejects a Teacher reading a colleague's staff record with a 404, not a 403", () => {
    let caught: unknown;
    try {
      assertCanReadStaff(makeStaff(teacherBId), makeUser(teacherAId, 'Teacher'));
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).statusCode).toBe(404);
  });

  it('rejects a Teacher reading a staff record with no linked userId at all', () => {
    expect(() => assertCanReadStaff(makeStaff(undefined), makeUser(teacherAId, 'Teacher'))).toThrow(ApiError);
  });
});
