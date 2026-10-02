import { ApiError } from '../../utils/ApiError';
import { IAssignment } from '../../models/Assignment';
import { ISubmission } from '../../models/Submission';
import * as repo from './lms.repository';
import { ListAssignmentsQuery, CreateAssignmentInput, SubmitInput, GradeInput } from './lms.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeSubmissionFilter, canManageAssignments, canSubmit } from './lms.ownership';
import { isSubmissionLate } from './lms.deadline';
import { logAudit } from '../audit/audit.service';

export async function listAssignments(query: ListAssignmentsQuery) {
  const { items, total } = await repo.findManyAssignments(query);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function createAssignment(
  input: CreateAssignmentInput,
  requester: AuthenticatedUser,
): Promise<IAssignment> {
  if (!canManageAssignments(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may create an assignment');
  const created = await repo.createAssignment(input, requester.id);
  await logAudit(`Published assignment ${created.title} for ${created.grade}`, 'LMS', requester.id);
  return created;
}

/**
 * Resolves "which student ids may this requester see" differently depending on the
 * RELATIONSHIP, not just the role - a Student sees only their OWN linked record (via the new
 * studentUserId field), a Parent sees their linked children's (via the existing guardianUserId
 * field). Both produce the same shape of list that scopeSubmissionFilter then applies uniformly.
 */
async function resolveAuthorizedStudentIds(requester: AuthenticatedUser) {
  if (requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Teacher') return [];
  if (requester.role === 'Student') {
    const ownId = await repo.findStudentIdByStudentUserId(requester.id);
    return ownId ? [ownId] : [];
  }
  return repo.findAuthorizedStudentIdsByGuardian(requester.id);
}

export async function listSubmissions(requester: AuthenticatedUser, assignmentId?: string): Promise<ISubmission[]> {
  const authorizedStudentIds = await resolveAuthorizedStudentIds(requester);
  return repo.findSubmissions((base) => scopeSubmissionFilter(base, requester, authorizedStudentIds), assignmentId);
}

export async function submitAssignment(
  assignmentId: string,
  input: SubmitInput,
  requester: AuthenticatedUser,
): Promise<ISubmission> {
  if (!canSubmit(requester.role)) throw ApiError.forbidden('Only a Student may submit an assignment');

  const student = await repo.findStudentByStudentUserId(requester.id);
  if (!student)
    throw ApiError.badRequest(
      'No student record is linked to your account - a submission must be tied to a student record',
    );

  const assignment = await repo.findAssignmentById(assignmentId);
  if (!assignment) throw ApiError.notFound('Assignment not found');
  if (student.status !== 'Active') throw ApiError.conflict('Only an active student may submit coursework');
  if (student.grade !== assignment.grade) {
    throw ApiError.forbidden('This assignment is not assigned to your grade');
  }

  const submittedAt = new Date();
  const isLate = isSubmissionLate(submittedAt, assignment.dueDate);

  try {
    const created = await repo.createSubmission(assignmentId, student._id.toString(), input, isLate);
    await logAudit(
      `Submitted ${isLate ? 'late ' : ''}coursework ${assignment.title} for ${student.refId}`,
      'LMS',
      requester.id,
      isLate ? 'Warning' : 'Info',
    );
    return created;
  } catch (err) {
    if (err instanceof Error && (err as Error & { code?: number }).code === 11000) {
      throw ApiError.conflict('You have already submitted this assignment');
    }
    throw err;
  }
}

export async function gradeSubmission(
  id: string,
  input: GradeInput,
  requester: AuthenticatedUser,
): Promise<ISubmission> {
  if (!canManageAssignments(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may grade a submission');

  const submission = await repo.findSubmissionById(id);
  if (!submission) throw ApiError.notFound('Submission not found');

  const assignment = await repo.findAssignmentById(submission.assignment.toString());
  if (assignment && input.score > assignment.maxScore) {
    throw ApiError.badRequest(`Score cannot exceed the assignment's maxScore of ${assignment.maxScore}`);
  }

  const updated = await repo.gradeSubmission(id, input);
  if (!updated) throw ApiError.notFound('Submission not found');
  await logAudit(`Graded submission for ${assignment?.title ?? 'coursework'}`, 'LMS', requester.id);
  return updated;
}
