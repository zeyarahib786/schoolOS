import { FilterQuery, Types } from 'mongoose';
import { IAttendance } from '../../models/Attendance';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role } from '../../types/roles';

/** Administrator/Principal/Teacher have unrestricted read access to attendance records - matches
 * WRITE_ROLES, since marking and reviewing attendance is core to a teacher's job. Deliberately
 * does NOT include Accountant here (unlike Students, where Accountant needs fee-status visibility)
 * - there's no equivalent business need for Accountant to see attendance records. */
const UNRESTRICTED_READ_ROLES: Role[] = ['Administrator', 'Principal', 'Teacher'];

/**
 * Unlike student.ownership.ts and staff.ownership.ts, Attendance has no direct ownership field
 * of its own - it references a student, and the student has guardianUserId. So this function
 * takes the already-resolved list of student ids a Parent is authorized to see (looked up by the
 * service layer via Student.find({guardianUserId}) - a real DB query that can't be part of this
 * pure function) rather than resolving it itself. Keeping the resolution step separate from the
 * filter-building step is what keeps THIS function unit-testable without a database, the same
 * design already used for Students and Staff.
 */
export function scopeAttendanceFilter(
  base: FilterQuery<IAttendance>,
  requester: AuthenticatedUser,
  authorizedStudentIds: Types.ObjectId[],
): FilterQuery<IAttendance> {
  if (UNRESTRICTED_READ_ROLES.includes(requester.role)) {
    return base;
  }
  return { ...base, student: { $in: authorizedStudentIds } };
}

export function canMarkAttendance(role: Role): boolean {
  return UNRESTRICTED_READ_ROLES.includes(role);
}
