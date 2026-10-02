import { FilterQuery } from 'mongoose';
import { ApiError } from '../../utils/ApiError';
import { IStudent } from '../../models/Student';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role } from '../../types/roles';

/** Roles with unrestricted read access across all students (matches the product role
 * model, where Administrator/Principal/Teacher/Accountant all have full read scope client-side). */
const UNRESTRICTED_READ_ROLES: Role[] = ['Administrator', 'Principal', 'Teacher', 'Accountant'];

/**
 * Applies ownership-based scoping to a student list/read query - the actual IDOR fix.
 * RBAC alone (requireRole) only controls *which actions* a role can attempt; it does nothing
 * to stop a Parent from reading a student that isn't theirs by simply changing the :id in the
 * URL. This function is the second, independent layer: it narrows *which records* a request is
 * even allowed to see, based on who's asking - and it's a pure function (no DB, no Express),
 * so it can be unit-tested exhaustively without a running database.
 *
 * A Parent may see only their linked children, and a Student may see only the
 * record linked through studentUserId. Unlinked accounts match no records.
 */
export function scopeStudentFilter(base: FilterQuery<IStudent>, requester: AuthenticatedUser): FilterQuery<IStudent> {
  if (UNRESTRICTED_READ_ROLES.includes(requester.role)) {
    return base;
  }
  if (requester.role === 'Parent') {
    return { ...base, guardianUserId: requester.id };
  }
  if (requester.role === 'Student') {
    return { ...base, studentUserId: requester.id };
  }
  // Unknown roles never receive an unscoped view.
  return { ...base, _id: { $in: [] } };
}

/** Used for single-record reads (GET /students/:id) where a Mongo filter can't express
 * "not found" vs "found but not yours" without an extra query - so this checks the already-
 * fetched document directly and throws the same 404 either way. Returning 403 here would leak
 * that the record exists at all to someone who isn't authorized to know that (an IDOR-adjacent
 * information disclosure) - a 404 is the correct response in both cases. */
export function assertCanReadStudent(student: IStudent, requester: AuthenticatedUser): void {
  if (UNRESTRICTED_READ_ROLES.includes(requester.role)) return;
  if (requester.role === 'Parent' && student.guardianUserId?.toString() === requester.id) return;
  if (requester.role === 'Student' && student.studentUserId?.toString() === requester.id) return;
  throw ApiError.notFound('Student not found');
}
