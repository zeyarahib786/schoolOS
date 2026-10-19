import { validateAssessment, assessAnswers } from './lms.assessment';
import { requireTeaching, teacherScope } from './lms.teaching.service';
import mongoose, { FilterQuery } from 'mongoose';
import { Assignment } from '../../models/Assignment';
import { Submission } from '../../models/Submission';
import { Student } from '../../models/Student';
import { Course } from '../../models/Course';
import { getSettings } from '../settings/settings.repository';
import { assignmentDeadline } from './lms.dates';
import { UpdateAssignmentInput } from './lms.validation';
import { ApiError } from '../../utils/ApiError';
import { IAssignment } from '../../models/Assignment';
import { ISubmission } from '../../models/Submission';
import * as repo from './lms.repository';
import { ListAssignmentsQuery, CreateAssignmentInput, SubmitInput, GradeInput } from './lms.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeSubmissionFilter, canManageAssignments, canSubmit } from './lms.ownership';
import { isSubmissionLate } from './lms.deadline';
import { logAudit } from '../audit/audit.service';

export async function listAssignments(query: ListAssignmentsQuery, user: AuthenticatedUser) {
  const scope = await assignmentScope(user);
  const { items, total } = await repo.findManyAssignments(query, scope);
  return {
    items: canManageAssignments(user.role)
      ? items
      : items.map((r) => ({
          ...r.toObject(),
          questions: r.questions?.map((q) => ({
            id: q.id,
            type: q.type,
            prompt: q.prompt,
            options: q.options,
            marks: q.marks,
          })),
          history: [],
          automationSummary: undefined,
          reminderSummary: undefined,
          batchKey: undefined,
          publicationEvent: undefined,
          publisher: undefined,
        })),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function createAssignment(
  input: CreateAssignmentInput,
  requester: AuthenticatedUser,
): Promise<IAssignment> {
  if (!canManageAssignments(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may create an assignment');
  const prepared = await prepareAssignment(input, requester);
  const created = await Assignment.create(prepared);
  await logAudit(`Saved assignment ${created.title} for ${created.grade}`, 'LMS', requester.id);
  return created;
}
export async function prepareAssignment(input: CreateAssignmentInput, requester: AuthenticatedUser) {
  validateAssessment(input.questions || [], input.maxScore);
  const academicYear = input.academicYear || (await getSettings()).academicYear;
  await requireTeaching(requester, input.grade, input.subject, academicYear);
  const dueDate = await assignmentDeadline(input.dueDate);
  const publishAt = input.publishAt ? new Date(input.publishAt) : undefined;
  if (input.status === 'Scheduled' && (!publishAt || publishAt <= new Date() || publishAt >= dueDate))
    throw ApiError.badRequest('Scheduled publishing requires a future publish time before the deadline');
  if (input.status !== 'Scheduled' && publishAt)
    throw ApiError.badRequest('Publish time is only allowed for Scheduled assignments');
  if (input.course) {
    const course = await Course.findById(input.course);
    if (!course || course.archived) throw ApiError.badRequest('Select an active course');
    if (course.grade !== input.grade || course.subject !== input.subject || course.academicYear !== academicYear)
      throw ApiError.badRequest('Assignment must match course grade and subject');
  }
  return {
    ...input,
    dueDate,
    academicYear,
    publishAt,
    publisher: requester.id,
    publicationEvent: input.status === 'Published' ? String(new mongoose.Types.ObjectId()) : undefined,
    createdBy: requester.id,
  };
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
  return requester.role === 'Parent' ? repo.findAuthorizedStudentIdsByGuardian(requester.id) : [];
}

export async function listSubmissions(requester: AuthenticatedUser, assignmentId?: string) {
  const authorizedStudentIds = await resolveAuthorizedStudentIds(requester);
  const teacherAssignments =
    requester.role === 'Teacher' ? await Assignment.find(await assignmentScope(requester)).select('_id') : null;
  const records = await repo.findSubmissions(
    (base) =>
      teacherAssignments
        ? {
            ...base,
            assignment: { $in: teacherAssignments.map((r) => r._id), ...(assignmentId ? { $eq: assignmentId } : {}) },
          }
        : scopeSubmissionFilter(base, requester, authorizedStudentIds),
    assignmentId,
  );
  return canManageAssignments(requester.role)
    ? records
    : records.map((r) => ({ ...r.toObject(), gradeHistory: [], gradedBy: undefined, objectiveScore: undefined }));
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

  const session = await mongoose.startSession();
  let created: ISubmission | undefined;
  try {
    await session.withTransaction(async () => {
      const assignment = await Assignment.findById(assignmentId).session(session);
      if (!assignment) throw ApiError.notFound('Assignment not found');
      if (student.status !== 'Active') throw ApiError.conflict('Only an active student may submit coursework');
      if (student.grade !== assignment.grade) throw ApiError.forbidden('This assignment is not assigned to your grade');
      if (assignment.status !== 'Published') throw ApiError.conflict('Assignment is not accepting submissions');
      const isLate = isSubmissionLate(new Date(), assignment.dueDate);
      if (isLate && !assignment.acceptLate) throw ApiError.conflict('The submission deadline has passed');
      await Assignment.updateOne({ _id: assignmentId }, { $inc: { __v: 1 } }, { session });
      const assessment = assignment.questions?.length ? assessAnswers(assignment.questions, input.answers || []) : null;
      if (!assessment && !input.content.trim()) throw ApiError.badRequest('A response is required');
      [created] = await Submission.create(
        [
          {
            assignment: assignmentId,
            student: student._id,
            content: assessment?.content || input.content,
            answers: input.answers || [],
            objectiveScore: assessment?.objectiveScore,
            isLate,
          },
        ],
        { session },
      );
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000)
      throw ApiError.conflict('You have already submitted this assignment');
    throw err;
  } finally {
    await session.endSession();
  }
  if (!created) throw ApiError.conflict('Submission could not be saved');
  await logAudit('Submitted coursework ' + assignmentId, 'LMS', requester.id, created.isLate ? 'Warning' : 'Info');
  return created;
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
  if (!assignment) throw ApiError.notFound('Assignment not found');
  await requireTeaching(requester, assignment.grade, assignment.subject, assignment.academicYear);
  if (assignment && input.score > assignment.maxScore) {
    throw ApiError.badRequest(`Score cannot exceed the assignment's maxScore of ${assignment.maxScore}`);
  }

  const updated = await Submission.findOneAndUpdate(
    { _id: id, updatedAt: new Date(input.expectedUpdatedAt) },
    {
      $set: {
        score: input.score,
        feedback: input.feedback || '',
        status: 'Graded',
        gradedBy: requester.id,
        gradedAt: new Date(),
      },
      $push: {
        gradeHistory: {
          at: new Date(),
          actor: requester.id,
          reason: input.reason,
          previousScore: submission.score,
          score: input.score,
          feedback: input.feedback || '',
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!updated) throw ApiError.conflict('Submission changed; refresh before grading');
  await logAudit(`Graded submission for ${assignment?.title ?? 'coursework'}`, 'LMS', requester.id);
  return updated;
}

export async function assignmentScope(user: AuthenticatedUser): Promise<FilterQuery<IAssignment>> {
  if (user.role === 'Teacher') {
    const scopes = await teacherScope(user);
    return scopes.length ? { $or: scopes } : { _id: { $in: [] } };
  }
  if (canManageAssignments(user.role)) return {};
  const published = { status: { $in: ['Published', 'Closed'] } };
  if (user.role !== 'Parent' && user.role !== 'Student') return published;
  const students = await Student.find(
    user.role === 'Student' ? { studentUserId: user.id } : { guardianUserId: user.id },
  ).select('grade');
  return { ...published, grade: { $in: students.map((r) => r.grade) } };
}
function assignmentSnapshot(a: IAssignment) {
  return {
    title: a.title,
    description: a.description,
    subject: a.subject,
    grade: a.grade,
    academicYear: a.academicYear,
    dueDate: a.dueDate,
    maxScore: a.maxScore,
    status: a.status,
    acceptLate: a.acceptLate,
    course: a.course,
  };
}
export async function updateAssignment(id: string, input: UpdateAssignmentInput, user: AuthenticatedUser) {
  const current = await Assignment.findById(id);
  if (!current) throw ApiError.notFound('Assignment not found');
  await requireTeaching(user, current.grade, current.subject, current.academicYear);
  const { expectedUpdatedAt, reason, ...changes } = input;
  if (current.updatedAt.toISOString() !== expectedUpdatedAt)
    throw ApiError.conflict('Assignment changed; refresh before saving');
  await requireTeaching(
    user,
    changes.grade || current.grade,
    changes.subject || current.subject,
    changes.academicYear || current.academicYear,
  );
  validateAssessment(changes.questions || current.questions || [], changes.maxScore ?? current.maxScore);
  const status = changes.status || current.status;
  const targetDue = changes.dueDate ? await assignmentDeadline(changes.dueDate) : current.dueDate;
  const targetPublish =
    changes.publishAt === null ? undefined : changes.publishAt ? new Date(changes.publishAt) : current.publishAt;
  if (status === 'Scheduled' && (!targetPublish || targetPublish <= new Date() || targetPublish >= targetDue))
    throw ApiError.badRequest('Scheduled publishing requires a future publish time before the deadline');
  if (status !== 'Scheduled' && changes.publishAt)
    throw ApiError.badRequest('Publish time is only allowed for Scheduled assignments');
  if (await Submission.exists({ assignment: id })) {
    if (
      (changes.questions !== undefined && JSON.stringify(changes.questions) !== JSON.stringify(current.questions)) ||
      (changes.maxScore !== undefined && changes.maxScore !== current.maxScore) ||
      (changes.grade !== undefined && changes.grade !== current.grade) ||
      (changes.subject !== undefined && changes.subject !== current.subject) ||
      (changes.academicYear !== undefined && changes.academicYear !== current.academicYear) ||
      (changes.course !== undefined && String(changes.course) !== String(current.course)) ||
      changes.status === 'Draft' ||
      changes.status === 'Scheduled'
    )
      throw ApiError.conflict('Submitted coursework locks scope, maximum score and publication');
  }
  if (changes.course) {
    const course = await Course.findById(changes.course);
    if (
      !course ||
      (course.archived && String(changes.course) !== String(current.course)) ||
      course.academicYear !== (changes.academicYear || current.academicYear) ||
      course.grade !== (changes.grade || current.grade) ||
      course.subject !== (changes.subject || current.subject)
    )
      throw ApiError.badRequest('Select an active course matching the assignment scope');
  }
  const payload = {
    ...changes,
    dueDate: targetDue,
    publishAt: status === 'Scheduled' ? targetPublish : null,
    ...(changes.status && changes.status !== current.status ? { publisher: user.id } : {}),
    ...(status === 'Published' && current.status !== 'Published'
      ? { publicationEvent: String(new mongoose.Types.ObjectId()), publicationNotifiedAt: null, automationSummary: '' }
      : {}),
  };
  const saved = await Assignment.findOneAndUpdate(
    { _id: id, updatedAt: new Date(expectedUpdatedAt), __v: current.__v },
    {
      $set: payload,
      $inc: { __v: 1 },
      $push: {
        history: {
          at: new Date(),
          actor: user.id,
          reason,
          before: assignmentSnapshot(current),
          after: { ...assignmentSnapshot(current), ...payload },
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!saved) throw ApiError.conflict('Assignment changed; refresh before saving');
  await logAudit('Reviewed assignment ' + id, 'LMS', user.id);
  return saved;
}
