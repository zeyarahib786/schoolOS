import { FilterQuery, Types } from 'mongoose';
import { IExamResult } from '../../models/ExamResult';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role } from '../../types/roles';

/** Same read-access shape as Students/Attendance - Administrator/Principal/Teacher unrestricted
 * (a teacher needs to see results to do their job), Accountant excluded (no business need,
 * matching Fees' logic in reverse - Accountant needs financial data, not academic data). */
const UNRESTRICTED_READ_ROLES: Role[] = ['Administrator', 'Principal', 'Teacher'];

const WRITE_ROLES_FOR_EXAMS: Role[] = ['Administrator', 'Principal', 'Teacher'];

export function scopeResultFilter(
  base: FilterQuery<IExamResult>,
  requester: AuthenticatedUser,
  authorizedStudentIds: Types.ObjectId[],
): FilterQuery<IExamResult> {
  if (UNRESTRICTED_READ_ROLES.includes(requester.role)) {
    return base;
  }
  // Parents receive marks only once the school has formally published (locked) the exam.
  // Staff can see draft marks for entry and moderation.
  return { $and: [base, { student: { $in: authorizedStudentIds } }] };
}

export function canManageExams(role: Role): boolean {
  return WRITE_ROLES_FOR_EXAMS.includes(role);
}
