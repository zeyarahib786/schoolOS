import { FilterQuery, Types } from 'mongoose';
import { Exam, IExam } from '../../models/Exam';
import { ExamResult, IExamResult } from '../../models/ExamResult';
import { Student } from '../../models/Student';
import { Role } from '../../types/roles';
import { ListExamsQuery, ListResultsQuery, CreateExamInput, RecordResultInput } from './exams.validation';

export async function findManyExams(query: ListExamsQuery): Promise<{ items: IExam[]; total: number }> {
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Exam.find().sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Exam.countDocuments(),
  ]);
  return { items, total };
}

export function findExamById(id: string): Promise<IExam | null> {
  return Exam.findById(id);
}

export async function findPublishedExamIds(): Promise<Types.ObjectId[]> {
  const exams = await Exam.find({ locked: true }).select('_id');
  return exams.map((exam) => exam._id);
}

export function createExam(input: CreateExamInput): Promise<IExam> {
  return Exam.create(input);
}

export function addExamSubject(id: string, subject: string): Promise<IExam | null> {
  return Exam.findByIdAndUpdate(id, { $addToSet: { subjects: subject } }, { new: true, runValidators: true });
}

export function removeExamSubject(id: string, subject: string): Promise<IExam | null> {
  return Exam.findByIdAndUpdate(id, { $pull: { subjects: subject } }, { new: true, runValidators: true });
}

export function setLocked(id: string, locked: boolean): Promise<IExam | null> {
  return Exam.findByIdAndUpdate(id, { locked }, { new: true, runValidators: true });
}

export function findStudentById(id: string) {
  return Student.findById(id).select('_id name guardianUserId grade');
}

export function findResultWithStudent(examId: string, studentId: string) {
  return ExamResult.findOne({ exam: examId, student: studentId }).populate('student', 'name guardianUserId grade');
}

export function findResultRecipients(examId: string) {
  return ExamResult.find({ exam: examId }).populate('student', 'name guardianUserId');
}

export async function findManyResults(
  query: ListResultsQuery,
  applyOwnershipScope: (base: FilterQuery<IExamResult>) => FilterQuery<IExamResult>,
): Promise<{ items: IExamResult[]; total: number }> {
  let filter: FilterQuery<IExamResult> = {};
  if (query.examId) filter.exam = query.examId;
  if (query.studentId) filter.student = query.studentId;
  filter = applyOwnershipScope(filter);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    ExamResult.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('student', 'name refId grade'),
    ExamResult.countDocuments(filter),
  ]);
  return { items, total };
}

/** Upsert, not insert-or-error: re-recording a result for the same (exam, student) replaces the
 * existing scores rather than requiring a separate "correct a mark" endpoint - a teacher fixing
 * a data-entry mistake should be the same action as entering it the first time. */
export function upsertResult(input: RecordResultInput, recordedBy: string): Promise<IExamResult> {
  return ExamResult.findOneAndUpdate(
    { exam: input.examId, student: input.studentId },
    { scores: input.scores, recordedBy },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ) as Promise<IExamResult>;
}

/**
 * Real MongoDB aggregation - the first module in this codebase to need one, rather than a
 * find/filter/populate. Computes the class average and pass count directly in the database
 * rather than pulling every result document into the application and reducing in memory, which
 * matters once an exam has hundreds of results rather than a handful.
 */
export async function computeExamAggregate(examId: string, maxMarks: number, passMark: number) {
  const results = await ExamResult.aggregate([
    { $match: { exam: new Types.ObjectId(examId) } },
    { $unwind: '$scores' },
    {
      $group: {
        _id: '$_id',
        totalMarks: { $sum: '$scores.marks' },
        subjectCount: { $sum: 1 },
      },
    },
    {
      $project: {
        averagePercent: { $multiply: [{ $divide: ['$totalMarks', { $multiply: ['$subjectCount', maxMarks] }] }, 100] },
      },
    },
    {
      $group: {
        _id: null,
        studentCount: { $sum: 1 },
        classAverage: { $avg: '$averagePercent' },
        passCount: { $sum: { $cond: [{ $gte: ['$averagePercent', passMark] }, 1, 0] } },
      },
    },
  ]);
  const agg = results[0] ?? { studentCount: 0, classAverage: 0, passCount: 0 };
  return {
    studentCount: agg.studentCount,
    classAverage: Math.round((agg.classAverage ?? 0) * 10) / 10,
    passCount: agg.passCount,
    passRate: agg.studentCount > 0 ? Math.round((agg.passCount / agg.studentCount) * 100) : 0,
  };
}

export function findAuthorizedStudentIds(userId: string, role: Role) {
  const filter = role === 'Parent' ? { guardianUserId: userId }
    : role === 'Student' ? { studentUserId: userId }
    : { _id: { $in: [] } };
  return Student.find(filter)
    .select('_id')
    .then((students) => students.map((s) => s._id));
}
