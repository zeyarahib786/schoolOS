import mongoose from 'mongoose';
import { Exam } from '../../models/Exam';
import { ExamResult } from '../../models/ExamResult';
import { Student } from '../../models/Student';
import { User } from '../../models/User';
import { Guardian } from '../../models/Guardian';
import { SaveExamRegisterInput, UpdateExamInput } from './exams.validation';
import { ApiError } from '../../utils/ApiError';
import { IExam } from '../../models/Exam';
import { IExamResult } from '../../models/ExamResult';
import * as repo from './exams.repository';
import { ListExamsQuery, ListResultsQuery, CreateExamInput, RecordResultInput } from './exams.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeResultFilter, canManageExams } from './exams.ownership';
import { computeAveragePercent, computeRawAveragePercent, computeGrade, isPassing } from './exams.grading';
import { Message } from '../../models/Message';
import { Certificate } from '../../models/Certificate';
import { logAudit } from '../audit/audit.service';
import { GenerateReportCardsInput } from './exams.validation';

export async function listExams(query: ListExamsQuery) {
  const { items, total } = await repo.findManyExams(query);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function createExam(input: CreateExamInput, requester: AuthenticatedUser): Promise<IExam> {
  if (!canManageExams(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may create an exam scheme');
  const created = await repo.createExam({ ...input, subjects: uniqueSubjects(input.subjects) });
  await logAudit(`Created exam scheme ${created.name} (${created.term})`, 'Exams', requester.id);
  return created;
}

function uniqueSubjects(subjects: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const subject of subjects) {
    const key = subject.trim().toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      output.push(subject.trim());
    }
  }
  if (output.length !== subjects.length) throw ApiError.badRequest('Each exam subject must be unique');
  return output;
}

async function getExamOrThrow(id: string): Promise<IExam> {
  const exam = await repo.findExamById(id);
  if (!exam) throw ApiError.notFound('Exam not found');
  return exam;
}

export async function addSubject(examId: string, subject: string, requester: AuthenticatedUser): Promise<IExam> {
  if (!canManageExams(requester.role)) throw ApiError.forbidden('Only teaching staff may manage subjects');
  const updated = await mongoose.connection.transaction(async (session) => {
    const exam = await lockForMarks(examId, session);
    if (await ExamResult.exists({ exam: examId }).session(session))
      throw ApiError.conflict('Subjects cannot change after results exist; create a new scheme');
    if (exam.subjects.some((s) => s.toLowerCase() === subject.trim().toLowerCase()))
      throw ApiError.badRequest('This subject already belongs to the exam');
    if (exam.subjects.length >= 30) throw ApiError.badRequest('An exam can have at most 30 subjects');
    exam.subjects.push(subject);
    await exam.save({ session });
    return exam;
  });
  await logAudit(`Added ${subject} to exam ${updated.name}`, 'Exams', requester.id);
  return updated;
}
export async function removeSubject(examId: string, subject: string, requester: AuthenticatedUser): Promise<IExam> {
  if (!canManageExams(requester.role)) throw ApiError.forbidden('Only teaching staff may manage subjects');
  const updated = await mongoose.connection.transaction(async (session) => {
    const exam = await lockForMarks(examId, session);
    if (await ExamResult.exists({ exam: examId }).session(session))
      throw ApiError.conflict('Subjects cannot change after results exist; create a new scheme');
    if (exam.subjects.length <= 1) throw ApiError.badRequest('At least one subject is required');
    if (!exam.subjects.includes(subject)) throw ApiError.notFound('Subject not found');
    exam.subjects = exam.subjects.filter((s) => s !== subject);
    exam.schedule = exam.schedule.filter((row) => row.subject !== subject);
    await exam.save({ session });
    return exam;
  });
  await logAudit(`Removed ${subject} from exam ${updated.name}`, 'Exams', requester.id);
  return updated;
}

function withComputedFields(result: IExamResult, maxMarks: number, passMark: number) {
  const averagePercent = computeAveragePercent(result.scores, maxMarks);
  const exactPercent = computeRawAveragePercent(result.scores, maxMarks);
  return {
    ...result.toObject(),
    averagePercent,
    grade: computeGrade(exactPercent),
    passing: isPassing(exactPercent, (passMark / maxMarks) * 100),
  };
}

export async function listResults(query: ListResultsQuery, requester: AuthenticatedUser) {
  const authorizedStudentIds =
    requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Teacher'
      ? []
      : await repo.findAuthorizedStudentIds(requester.id, requester.role);

  const familyScope = requester.role === 'Parent' || requester.role === 'Student';
  const publishedExamIds = familyScope ? await repo.findPublishedExamIds() : [];
  const { items, total } = await repo.findManyResults(query, (base) => {
    const scoped = scopeResultFilter(base, requester, authorizedStudentIds);
    return familyScope ? { $and: [scoped, { exam: { $in: publishedExamIds } }] } : scoped;
  });

  // Results can span multiple exams (e.g. an unfiltered list), each with its own maxMarks/passMark
  // - resolve per-result rather than assuming a single exam's settings apply to every row.
  const examIds = [...new Set(items.map((r) => r.exam.toString()))];
  const exams = await Promise.all(examIds.map((id) => repo.findExamById(id)));
  const examById = new Map(exams.filter((e): e is IExam => e !== null).map((e) => [e._id.toString(), e]));

  const visibleItems = familyScope ? items.filter((r) => examById.get(r.exam.toString())?.locked) : items;
  const withGrades = visibleItems.map((r) => {
    const exam = examById.get(r.exam.toString());
    const value = withComputedFields(r, exam?.maxMarks ?? 100, exam?.passMark ?? 50);
    if (familyScope) delete value.corrections;
    return value;
  });

  return {
    items: withGrades,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

function validateScores(exam: IExam, scores: RecordResultInput['scores']) {
  const supplied = uniqueSubjects(scores.map((score) => score.subject));
  if (supplied.length !== exam.subjects.length || supplied.some((subject) => !exam.subjects.includes(subject)))
    throw ApiError.badRequest('Marks are required for every configured subject, with no unknown subjects');
  if (scores.some((score) => score.marks < 0 || score.marks > exam.maxMarks))
    throw ApiError.badRequest(`Marks cannot exceed ${exam.maxMarks}`);
}
async function lockForMarks(examId: string, session: mongoose.ClientSession) {
  const exam = await Exam.findOneAndUpdate(
    { _id: examId, locked: false },
    { $inc: { __v: 1 } },
    { new: true, session },
  );
  if (!exam) {
    if (!(await Exam.exists({ _id: examId }).session(session))) throw ApiError.notFound('Exam not found');
    throw ApiError.forbidden('Published exams must be reopened before marking');
  }
  return exam;
}
export async function recordResult(input: RecordResultInput, requester: AuthenticatedUser) {
  if (!canManageExams(requester.role)) throw ApiError.forbidden('Only teaching staff may record marks');
  const result = await mongoose.connection.transaction(async (session) => {
    const exam = await lockForMarks(input.examId, session);
    validateScores(exam, input.scores);
    if (!(await Student.exists({ _id: input.studentId }).session(session)))
      throw ApiError.notFound('Student not found');
    const old = await ExamResult.findOne({ exam: input.examId, student: input.studentId }).session(session);
    if (old)
      throw ApiError.conflict('Use the versioned marks register and provide a correction reason to update saved marks');
    const updated = await ExamResult.findOneAndUpdate(
      { exam: input.examId, student: input.studentId },
      { $set: { scores: input.scores, recordedBy: requester.id } },
      { new: true, upsert: true, runValidators: true, session },
    );
    return withComputedFields(updated, exam.maxMarks, exam.passMark);
  });
  await logAudit('Recorded exam marks', 'Exams', requester.id);
  return result;
}
export async function saveExamRegister(examId: string, input: SaveExamRegisterInput, requester: AuthenticatedUser) {
  if (!canManageExams(requester.role)) throw ApiError.forbidden('Only teaching staff may save marks');
  const ids = input.entries.map((e) => e.studentId);
  if (new Set(ids).size !== ids.length) throw ApiError.badRequest('Each student may appear only once');
  await mongoose.connection.transaction(async (session) => {
    const exam = await lockForMarks(examId, session);
    for (const entry of input.entries) {
      validateScores(exam, entry.scores);
      if (!(await Student.exists({ _id: entry.studentId, status: 'Active' }).session(session)))
        throw ApiError.badRequest('Choose an active student');
      const key = { exam: examId, student: entry.studentId };
      const old = await ExamResult.findOne(key).session(session);
      if ((old?.updatedAt.toISOString() || null) !== entry.expectedUpdatedAt)
        throw ApiError.conflict('Marks changed by another editor. Reload before saving');
      const normalize = (scores: RecordResultInput['scores']) =>
        JSON.stringify([...scores].sort((a, b) => a.subject.localeCompare(b.subject)));
      const changed = old && normalize(old.scores) !== normalize(entry.scores);
      if (changed && !input.correctionReason) throw ApiError.badRequest('Provide a correction reason for saved marks');
      await ExamResult.findOneAndUpdate(
        key,
        {
          $set: { scores: entry.scores, recordedBy: requester.id },
          ...(changed
            ? {
                $push: {
                  corrections: {
                    reason: input.correctionReason,
                    previousScores: old.scores,
                    changedAt: new Date(),
                    changedBy: requester.id,
                  },
                },
              }
            : {}),
        },
        { new: true, upsert: true, runValidators: true, session },
      );
    }
  });
  await logAudit(
    `Saved ${input.entries.length} exam results${input.correctionReason ? ': ' + input.correctionReason : ''}`,
    'Exams',
    requester.id,
  );
  return { saved: input.entries.length };
}
export async function updateExam(id: string, input: UpdateExamInput, requester: AuthenticatedUser) {
  if (!canManageExams(requester.role)) throw ApiError.forbidden('Only teaching staff may edit schedules');
  const exam = await getExamOrThrow(id);
  uniqueSubjects(input.schedule.map((row) => row.subject));
  if (input.schedule.some((row) => !exam.subjects.includes(row.subject)))
    throw ApiError.badRequest('Schedule subjects must belong to the selected exam');
  const updated = await Exam.findOneAndUpdate(
    { _id: id, locked: false, updatedAt: new Date(input.expectedUpdatedAt) },
    { $set: { schedule: input.schedule } },
    { new: true, runValidators: true },
  );
  if (!updated) throw ApiError.conflict('Exam changed or is published. Reload/reopen before editing');
  await logAudit(`Saved datesheet for ${exam.name}`, 'Exams', requester.id);
  return updated;
}

async function activeGuardianIds(ids: mongoose.Types.ObjectId[], session?: mongoose.ClientSession) {
  const suspended = await Guardian.find({ userId: { $in: ids }, portalStatus: 'Suspended' })
    .session(session || null)
    .select('userId');
  const users = await User.find({
    _id: { $in: ids, $nin: suspended.map((g) => g.userId) },
    role: 'Parent',
    isActive: true,
  })
    .session(session || null)
    .select('_id');
  return new Set(users.map((u) => u._id.toString()));
}

export async function publishExam(examId: string, locked: boolean, requester: AuthenticatedUser) {
  if (!canManageExams(requester.role)) throw ApiError.forbidden('Only teaching staff may publish exams');
  let notified = 0;
  const updated = await mongoose.connection.transaction(async (session) => {
    notified = 0;
    const exam = await Exam.findById(examId).session(session);
    if (!exam) throw ApiError.notFound('Exam not found');
    if (exam.locked === locked) return exam;
    if (locked) {
      const results = await ExamResult.find({ exam: examId })
        .session(session)
        .populate('student', 'name guardianUserId');
      if (!results.length) throw ApiError.badRequest('Enter at least one complete result before publishing');
      for (const result of results) validateScores(exam, result.scores);
      const recipients = await activeGuardianIds(
        results
          .map((r) => (r.student as unknown as { guardianUserId?: mongoose.Types.ObjectId })?.guardianUserId)
          .filter((id): id is mongoose.Types.ObjectId => Boolean(id)),
        session,
      );
      const messages = results.flatMap((result) => {
        const student = result.student as unknown as { name: string; guardianUserId?: mongoose.Types.ObjectId };
        if (!student?.guardianUserId || !recipients.has(student.guardianUserId.toString())) return [];
        notified++;
        return [
          {
            sender: requester.id,
            recipient: student.guardianUserId,
            subject: `${exam.name} results published`,
            body: `${student.name}'s results are available in the parent portal.`,
          },
        ];
      });
      if (messages.length) await Message.insertMany(messages, { session });
    }
    exam.locked = locked;
    await exam.save({ session });
    return exam;
  });
  await logAudit(`${locked ? 'Published' : 'Reopened'} exam ${updated.name}`, 'Exams', requester.id);
  return { exam: updated, notified };
}

export async function notifyGuardian(examId: string, studentId: string, requester: AuthenticatedUser) {
  if (!canManageExams(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may share a result');
  const exam = await getExamOrThrow(examId);
  if (!exam.locked) throw ApiError.badRequest('Publish the exam before sharing results with guardians');
  const result = await repo.findResultWithStudent(examId, studentId);
  if (!result) throw ApiError.notFound('No result found for this student');
  const student = result.student as unknown as { name?: string; guardianUserId?: { toString(): string } };
  if (!student?.guardianUserId) throw ApiError.badRequest('This student has no linked guardian portal account');
  const recipients = await activeGuardianIds([new mongoose.Types.ObjectId(student.guardianUserId.toString())]);
  if (!recipients.has(student.guardianUserId.toString()))
    throw ApiError.badRequest('Linked guardian account is inactive or suspended');
  await Message.create({
    sender: requester.id,
    recipient: student.guardianUserId,
    subject: `${exam.name} result available`,
    body: `${student.name}'s ${exam.name} result is available in the parent portal.`,
  });
  await logAudit(`Shared ${exam.name} result with guardian for ${student.name}`, 'Exams', requester.id);
  return { sent: true };
}

export async function generateReportCards(
  examId: string,
  input: GenerateReportCardsInput,
  requester: AuthenticatedUser,
) {
  if (!canManageExams(requester.role)) throw ApiError.forbidden('Only teaching staff may issue report-card records');
  const output = await mongoose.connection.transaction(async (session) => {
    const exam = await Exam.findOneAndUpdate(
      { _id: examId, locked: true },
      { $inc: { __v: 1 } },
      { new: true, session },
    );
    if (!exam) throw ApiError.badRequest('Publish the exam before generating report cards');
    const results = await ExamResult.find({ exam: examId }).session(session).populate('student', 'name refId grade');
    let generated = 0,
      alreadyExisted = 0;
    for (const result of results) {
      const student = result.student as unknown as {
        _id: mongoose.Types.ObjectId;
        name: string;
        refId: string;
        grade: string;
      };
      if (input.grade && student.grade !== input.grade) continue;
      const certNumber = `RC-${examId}-${student._id}`;
      const existing = await Certificate.findOne({
        type: 'ReportCard',
        purpose: `Exam:${examId}`,
        student: student._id,
      }).session(session);
      if (existing) {
        alreadyExisted++;
        continue;
      }
      const averagePercent = computeAveragePercent(result.scores, exam.maxMarks);
      await Certificate.create(
        [
          {
            certNumber,
            student: student._id,
            type: 'ReportCard',
            purpose: `Exam:${examId}`,
            issuedBy: requester.id,
            issuedDate: new Date(),
            assessmentSnapshot: {
              examName: exam.name,
              term: exam.term,
              studentName: student.name,
              studentRef: student.refId,
              grade: student.grade,
              maxMarks: exam.maxMarks,
              passMark: exam.passMark,
              averagePercent,
              letterGrade: computeGrade(computeRawAveragePercent(result.scores, exam.maxMarks)),
              scores: result.scores.map((s) => ({ subject: s.subject, marks: s.marks })),
            },
          },
        ],
        { session },
      );
      generated++;
    }
    return { generated, alreadyExisted };
  });
  await logAudit(`Registered ${output.generated} report cards`, 'Exams', requester.id);
  return output;
}

export async function getExamSummary(examId: string) {
  const exam = await getExamOrThrow(examId);
  const aggregate = await repo.computeExamAggregate(examId, exam.maxMarks, (exam.passMark / exam.maxMarks) * 100);
  return { exam: { id: exam._id, name: exam.name, term: exam.term, subjects: exam.subjects }, ...aggregate };
}
