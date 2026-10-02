import { FilterQuery } from 'mongoose';
import { Assignment, IAssignment } from '../../models/Assignment';
import { Submission, ISubmission } from '../../models/Submission';
import { Student } from '../../models/Student';
import { ListAssignmentsQuery, CreateAssignmentInput, SubmitInput, GradeInput } from './lms.validation';

export async function findManyAssignments(
  query: ListAssignmentsQuery,
): Promise<{ items: IAssignment[]; total: number }> {
  const filter: FilterQuery<IAssignment> = {};
  if (query.subject) filter.subject = query.subject;
  if (query.grade) filter.grade = query.grade;

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Assignment.find(filter).sort({ dueDate: 1 }).skip(skip).limit(query.limit),
    Assignment.countDocuments(filter),
  ]);
  return { items, total };
}

export function findAssignmentById(id: string): Promise<IAssignment | null> {
  return Assignment.findById(id);
}

export function createAssignment(input: CreateAssignmentInput, createdBy: string): Promise<IAssignment> {
  return Assignment.create({ ...input, dueDate: new Date(input.dueDate), createdBy });
}

export async function findSubmissions(
  applyOwnershipScope: (base: FilterQuery<ISubmission>) => FilterQuery<ISubmission>,
  assignmentId?: string,
): Promise<ISubmission[]> {
  let filter: FilterQuery<ISubmission> = {};
  if (assignmentId) filter.assignment = assignmentId;
  filter = applyOwnershipScope(filter);
  return Submission.find(filter)
    .sort({ submittedAt: -1 })
    .populate('student', 'name refId grade')
    .populate('assignment', 'title subject dueDate maxScore');
}

export function createSubmission(
  assignmentId: string,
  studentId: string,
  input: SubmitInput,
  isLate: boolean,
): Promise<ISubmission> {
  return Submission.create({ assignment: assignmentId, student: studentId, content: input.content, isLate });
}

export function findSubmissionById(id: string): Promise<ISubmission | null> {
  return Submission.findById(id);
}

export function gradeSubmission(id: string, input: GradeInput): Promise<ISubmission | null> {
  return Submission.findByIdAndUpdate(
    id,
    { score: input.score, feedback: input.feedback, status: 'Graded' },
    { new: true, runValidators: true },
  );
}

export function findStudentIdByStudentUserId(studentUserId: string) {
  return Student.findOne({ studentUserId })
    .select('_id')
    .then((student) => student?._id ?? null);
}

export function findStudentByStudentUserId(studentUserId: string) {
  return Student.findOne({ studentUserId }).select('_id refId grade status');
}

export function findAuthorizedStudentIdsByGuardian(guardianUserId: string) {
  return Student.find({ guardianUserId })
    .select('_id')
    .then((students) => students.map((s) => s._id));
}
