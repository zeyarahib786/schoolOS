import { FilterQuery, Types } from 'mongoose';
import { ISubmission } from '../../models/Submission';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role, WRITE_ROLES } from '../../types/roles';

const UNRESTRICTED_READ_ROLES: Role[] = ['Administrator', 'Principal', 'Teacher'];

/**
 * The first module in this codebase to scope by BOTH a Parent's linked child AND a Student's OWN
 * linked record - two structurally identical resolve-then-scope shapes, but through different
 * fields (guardianUserId vs. the newly added studentUserId) depending on which role is asking.
 * The caller resolves `authorizedStudentIds` differently per role (see lms.service.ts) and this
 * function stays agnostic to which relationship produced that list - it only needs to know
 * "these are the student ids this requester may see."
 */
export function scopeSubmissionFilter(
  base: FilterQuery<ISubmission>,
  requester: AuthenticatedUser,
  authorizedStudentIds: Types.ObjectId[],
): FilterQuery<ISubmission> {
  if (UNRESTRICTED_READ_ROLES.includes(requester.role)) {
    return base;
  }
  return { ...base, student: { $in: authorizedStudentIds } };
}

export function canManageAssignments(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}

export function canSubmit(role: Role): boolean {
  return role === 'Student';
}
