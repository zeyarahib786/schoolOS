import { Types } from 'mongoose';
import { scopeAttendanceFilter, canMarkAttendance } from '../../src/modules/attendance/attendance.ownership';
import { AuthenticatedUser } from '../../src/middleware/auth';

function makeUser(id: string, role: AuthenticatedUser['role']): AuthenticatedUser {
  return { id, role };
}

const childAId = new Types.ObjectId();
const childBId = new Types.ObjectId();

describe('scopeAttendanceFilter', () => {
  it('leaves the filter unrestricted for Administrator, Principal, and Teacher', () => {
    for (const role of ['Administrator', 'Principal', 'Teacher'] as const) {
      const filter = scopeAttendanceFilter({ status: 'Present' }, makeUser('any', role), []);
      expect(filter).toEqual({ status: 'Present' });
    }
  });

  it('scopes a Parent to only their authorized (linked) student ids', () => {
    const filter = scopeAttendanceFilter({}, makeUser('parent-a', 'Parent'), [childAId, childBId]);
    expect(filter).toEqual({ $and: [{}, { student: { $in: [childAId, childBId] } }] });
  });

  it('scopes a Parent with NO linked students to match nothing (empty $in), not everything', () => {
    const filter = scopeAttendanceFilter({}, makeUser('parent-a', 'Parent'), []);
    expect(filter).toEqual({ $and: [{}, { student: { $in: [] } }] });
  });

  it('never lets a caller-supplied "student" filter escape the ownership scope for a restricted role', () => {
    const someoneElsesChild = new Types.ObjectId();
    const filter = scopeAttendanceFilter({ student: someoneElsesChild }, makeUser('parent-a', 'Parent'), [childAId]);
    // Both filters must match: asking for another child returns no records.
    expect(filter).toEqual({ $and: [{ student: someoneElsesChild }, { student: { $in: [childAId] } }] });
  });
});

describe('canMarkAttendance', () => {
  it('allows Administrator, Principal, and Teacher to mark attendance', () => {
    expect(canMarkAttendance('Administrator')).toBe(true);
    expect(canMarkAttendance('Principal')).toBe(true);
    expect(canMarkAttendance('Teacher')).toBe(true);
  });

  it('denies Accountant, Parent, and Student from marking attendance', () => {
    expect(canMarkAttendance('Accountant')).toBe(false);
    expect(canMarkAttendance('Parent')).toBe(false);
    expect(canMarkAttendance('Student')).toBe(false);
  });
});
