import { ApiError } from '../../utils/ApiError';
import { IExam } from '../../models/Exam';
import { IExamResult } from '../../models/ExamResult';
import * as repo from './exams.repository';
import { ListExamsQuery, ListResultsQuery, CreateExamInput, RecordResultInput } from './exams.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeResultFilter, canManageExams } from './exams.ownership';
import { computeAveragePercent, computeGrade, isPassing } from './exams.grading';
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
    if (!seen.has(key)) { seen.add(key); output.push(subject.trim()); }
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
  if (!canManageExams(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may manage exam subjects');
  const exam = await getExamOrThrow(examId);
  if (exam.locked) throw ApiError.forbidden('This exam is locked - subjects cannot be changed');
  if (exam.subjects.some((item) => item.toLocaleLowerCase() === subject.trim().toLocaleLowerCase()))
    throw ApiError.badRequest('This subject is already part of the exam');
  const updated = await repo.addExamSubject(examId, subject);
  if (!updated) throw ApiError.notFound('Exam not found');
  await logAudit(`Added ${subject} to exam ${updated.name}`, 'Exams', requester.id);
  return updated;
}

/** Enforces the "at least one subject" invariant at both service and schema level. */
export async function removeSubject(examId: string, subject: string, requester: AuthenticatedUser): Promise<IExam> {
  if (!canManageExams(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may manage exam subjects');
  const exam = await getExamOrThrow(examId);
  if (exam.locked) throw ApiError.forbidden('This exam is locked - subjects cannot be changed');
  if (exam.subjects.length <= 1)
    throw ApiError.badRequest('At least one subject is required - cannot remove the last one');
  const updated = await repo.removeExamSubject(examId, subject);
  if (!updated) throw ApiError.notFound('Exam not found');
  await logAudit(`Removed ${subject} from exam ${updated.name}`, 'Exams', requester.id, 'Warning');
  return updated;
}

function withComputedFields(result: IExamResult, maxMarks: number, passMark: number) {
  const averagePercent = computeAveragePercent(result.scores, maxMarks);
  return {
    ...result.toObject(),
    averagePercent,
    grade: computeGrade(averagePercent),
    passing: isPassing(averagePercent, passMark),
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
    return withComputedFields(r, exam?.maxMarks ?? 100, exam?.passMark ?? 50);
  });

  return {
    items: withGrades,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function recordResult(input: RecordResultInput, requester: AuthenticatedUser) {
  if (!canManageExams(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may record exam results');
  const exam = await getExamOrThrow(input.examId);
  if (exam.locked) throw ApiError.forbidden('This exam is locked - results can no longer be entered or corrected');

  const student = await repo.findStudentById(input.studentId);
  if (!student) throw ApiError.notFound('Student not found');
  const supplied = uniqueSubjects(input.scores.map((score) => score.subject));
  const invalidSubjects = supplied.filter((subject) => !exam.subjects.includes(subject));
  if (invalidSubjects.length > 0) {
    throw ApiError.badRequest(`Unknown subject(s) for this exam: ${invalidSubjects.join(', ')}`);
  }
  const missingSubjects = exam.subjects.filter((subject) => !supplied.includes(subject));
  if (missingSubjects.length > 0)
    throw ApiError.badRequest(`Marks are required for every subject: ${missingSubjects.join(', ')}`);
  const outOfRange = input.scores.filter((score) => score.marks > exam.maxMarks);
  if (outOfRange.length > 0)
    throw ApiError.badRequest(`Marks cannot exceed ${exam.maxMarks}: ${outOfRange.map((score) => score.subject).join(', ')}`);

  const result = await repo.upsertResult(input, requester.id);
  await logAudit(`Recorded marks for ${student.name} in ${exam.name}`, 'Exams', requester.id);
  return withComputedFields(result, exam.maxMarks, exam.passMark);
}

export async function publishExam(examId: string, locked: boolean, requester: AuthenticatedUser) {
  if (!canManageExams(requester.role)) throw ApiError.forbidden('Only Administrator, Principal, or Teacher may publish an exam');
  const exam = await getExamOrThrow(examId);
  if (exam.locked === locked) return { exam, notified: 0 };
  const updated = await repo.setLocked(examId, locked);
  if (!updated) throw ApiError.notFound('Exam not found');
  let notified = 0;
  if (locked) {
    const results = await repo.findResultRecipients(examId);
    const messages = results.flatMap((result) => {
      const student = result.student as unknown as { name?: string; guardianUserId?: { toString(): string } };
      if (!student?.guardianUserId) return [];
      notified += 1;
      return [{ sender: requester.id, recipient: student.guardianUserId, subject: `${exam.name} results published`, body: `${student.name}'s ${exam.name} results are now available in the parent portal.` }];
    });
    if (messages.length) await Message.insertMany(messages);
  }
  await logAudit(`${locked ? 'Published and locked' : 'Reopened'} exam ${updated.name}`, 'Exams', requester.id, locked ? 'Info' : 'Warning');
  return { exam: updated, notified };
}

export async function notifyGuardian(examId: string, studentId: string, requester: AuthenticatedUser) {
  if (!canManageExams(requester.role)) throw ApiError.forbidden('Only Administrator, Principal, or Teacher may share a result');
  const exam = await getExamOrThrow(examId);
  if (!exam.locked) throw ApiError.badRequest('Publish the exam before sharing results with guardians');
  const result = await repo.findResultWithStudent(examId, studentId);
  if (!result) throw ApiError.notFound('No result found for this student');
  const student = result.student as unknown as { name?: string; guardianUserId?: { toString(): string } };
  if (!student?.guardianUserId) throw ApiError.badRequest('This student has no linked guardian portal account');
  await Message.create({ sender: requester.id, recipient: student.guardianUserId, subject: `${exam.name} result available`, body: `${student.name}'s ${exam.name} result is available in the parent portal.` });
  await logAudit(`Shared ${exam.name} result with guardian for ${student.name}`, 'Exams', requester.id);
  return { sent: true };
}

export async function generateReportCards(examId: string, input: GenerateReportCardsInput, requester: AuthenticatedUser) {
  if (!canManageExams(requester.role)) throw ApiError.forbidden('Only Administrator, Principal, or Teacher may generate report cards');
  const exam = await getExamOrThrow(examId);
  if (!exam.locked) throw ApiError.badRequest('Publish the exam before generating report cards');
  const results = await repo.findResultRecipients(examId);
  const studentIdOf = (result: (typeof results)[number]) => {
    const student = result.student as unknown as { _id?: { toString(): string } };
    return student._id ? student._id.toString() : result.student.toString();
  };
  const selected = results.filter((result) => {
    const student = result.student as unknown as { grade?: string };
    return !input.grade || student.grade === input.grade;
  });
  const existing = await Certificate.find({ type: 'ReportCard', purpose: `Exam:${examId}`, student: { $in: selected.map(studentIdOf) } }).select('student');
  const existingIds = new Set(existing.map((card) => card.student.toString()));
  const created = await Promise.all(selected.filter((result) => !existingIds.has(studentIdOf(result))).map(async (result) => {
    const studentId = studentIdOf(result);
    return Certificate.create({ certNumber: `RC-${exam._id.toString().slice(-8).toUpperCase()}-${studentId.slice(-6).toUpperCase()}`, student: studentId, type: 'ReportCard', purpose: `Exam:${examId}`, issuedBy: requester.id, issuedDate: new Date() });
  }));
  await logAudit(`Generated ${created.length} report card(s) for ${exam.name}`, 'Exams', requester.id);
  return { generated: created.length, alreadyExisted: selected.length - created.length };
}

export async function getExamSummary(examId: string) {
  const exam = await getExamOrThrow(examId);
  const aggregate = await repo.computeExamAggregate(examId, exam.maxMarks, exam.passMark);
  return { exam: { id: exam._id, name: exam.name, term: exam.term, subjects: exam.subjects }, ...aggregate };
}
