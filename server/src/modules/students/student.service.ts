import { User } from '../../models/User';
import { ApiError } from '../../utils/ApiError';
import { Student, IStudent } from '../../models/Student';
import { Attendance } from '../../models/Attendance';
import { Invoice } from '../../models/Invoice';
import { ExamResult } from '../../models/ExamResult';
import { BehaviourIncident } from '../../models/BehaviourIncident';
import { ClinicVisit } from '../../models/ClinicVisit';
import { Loan } from '../../models/Loan';
import { Certificate } from '../../models/Certificate';
import { Submission } from '../../models/Submission';
import { CafeteriaWallet } from '../../models/CafeteriaWallet';
import { CafeteriaAllergyPlan } from '../../models/CafeteriaAllergyPlan';
import { HostelLeave } from '../../models/HostelLeave';
import { HostelRollCall } from '../../models/HostelRollCall';
import { AlumniProfile } from '../../models/AlumniProfile';
import * as repo from './student.repository';
import { ListStudentsQuery, CreateStudentInput, UpdateStudentInput } from './student.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeStudentFilter, assertCanReadStudent } from './student.ownership';
import { logAudit } from '../audit/audit.service';
import { deleteDocumentFiles } from './student-documents.service';
import { generateStudentTranslations } from '../../utils/multilingual';

type StudentWithLiveSummary = ReturnType<IStudent['toObject']> & {
  attendancePct: number;
  feeStatus: 'Paid' | 'Pending' | 'Overdue';
  gpa: number;
  attendanceRecords: number;
  attendanceEligibleRecords: number;
  assessmentResults: number;
  invoiceRecords: number;
};

/**
 * Attendance, invoices and assessment results are the system of record for the three summary
 * values shown in Students. The fields on Student are retained for historical imports and for
 * records with no linked activity yet, but must never make a live record look current when it is
 * not. This batch implementation avoids one query per student on a full roster page.
 */
async function withLiveSummaries(students: IStudent[], publishedOnly = false): Promise<StudentWithLiveSummary[]> {
  if (!students.length) return [];
  const ids = students.map((student) => student._id);
  const [attendance, invoices, results] = await Promise.all([
    Attendance.aggregate<{ _id: (typeof ids)[number]; total: number; eligible: number; attended: number }>([
      { $match: { student: { $in: ids } } },
      {
        $group: {
          _id: '$student',
          total: { $sum: 1 },
          eligible: { $sum: { $cond: [{ $ne: ['$status', 'Excused'] }, 1, 0] } },
          attended: { $sum: { $cond: [{ $in: ['$status', ['Present', 'Late']] }, 1, 0] } },
        },
      },
    ]),
    Invoice.aggregate<{ _id: (typeof ids)[number]; paid: number; pending: number; overdue: number }>([
      { $match: { student: { $in: ids } } },
      {
        $group: {
          _id: '$student',
          paid: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          overdue: { $sum: { $cond: [{ $eq: ['$status', 'Overdue'] }, 1, 0] } },
        },
      },
    ]),
    ExamResult.aggregate<{ _id: (typeof ids)[number]; average: number; count: number }>([
      { $match: { student: { $in: ids } } },
      { $lookup: { from: 'exams', localField: 'exam', foreignField: '_id', as: 'exam' } },
      { $unwind: '$exam' },
      ...(publishedOnly ? [{ $match: { 'exam.locked': true } }] : []),
      { $unwind: '$scores' },
      {
        $group: {
          _id: '$_id',
          student: { $first: '$student' },
          marks: { $sum: '$scores.marks' },
          subjectCount: { $sum: 1 },
          maxMarks: { $first: '$exam.maxMarks' },
        },
      },
      {
        $project: {
          student: 1,
          percent: { $multiply: [{ $divide: ['$marks', { $multiply: ['$subjectCount', '$maxMarks'] }] }, 100] },
        },
      },
      { $group: { _id: '$student', average: { $avg: '$percent' }, count: { $sum: 1 } } },
    ]),
  ]);
  const attendanceByStudent = new Map(attendance.map((row) => [row._id.toString(), row]));
  const invoicesByStudent = new Map(invoices.map((row) => [row._id.toString(), row]));
  const resultsByStudent = new Map(results.map((row) => [row._id.toString(), row]));
  return students.map((student) => {
    const summary = student.toObject() as StudentWithLiveSummary;
    const attendanceSummary = attendanceByStudent.get(student._id.toString());
    const invoiceSummary = invoicesByStudent.get(student._id.toString());
    const resultSummary = resultsByStudent.get(student._id.toString());
    summary.attendanceRecords = attendanceSummary?.total ?? 0;
    summary.attendanceEligibleRecords = attendanceSummary?.eligible ?? 0;
    summary.assessmentResults = resultSummary?.count ?? 0;
    summary.invoiceRecords = invoiceSummary ? invoiceSummary.paid + invoiceSummary.pending + invoiceSummary.overdue : 0;
    if (attendanceSummary?.eligible)
      summary.attendancePct = Math.round((attendanceSummary.attended / attendanceSummary.eligible) * 100);
    if (invoiceSummary)
      summary.feeStatus = invoiceSummary.overdue ? 'Overdue' : invoiceSummary.pending ? 'Pending' : 'Paid';
    if (resultSummary) summary.gpa = Math.round((resultSummary.average / 25) * 100) / 100;
    return summary;
  });
}

function studentView(student: StudentWithLiveSummary, requester: AuthenticatedUser) {
  if (requester.role === 'Accountant') {
    for (const key of ['medicalNotes', 'allergies', 'bloodGroup', 'documents', 'dateOfBirth', 'enrollmentHistory'])
      delete (student as unknown as Record<string, unknown>)[key];
  }
  if (!['Administrator', 'Principal'].includes(requester.role)) {
    delete (student as unknown as Record<string, unknown>).guardianUserId;
    delete (student as unknown as Record<string, unknown>).studentUserId;
  }
  return student;
}
async function validateAccountLinks(
  input: CreateStudentInput | UpdateStudentInput,
  requester: AuthenticatedUser,
  studentId?: string,
) {
  if (input.guardianUserId === undefined && input.studentUserId === undefined) return;
  if (!['Administrator', 'Principal'].includes(requester.role))
    throw ApiError.forbidden('Only school administrators can manage portal links');
  for (const [key, role] of [
    ['guardianUserId', 'Parent'],
    ['studentUserId', 'Student'],
  ] as const) {
    const id = input[key];
    if (!id) continue;
    if (!(await User.exists({ _id: id, role, isActive: true })))
      throw ApiError.badRequest(`Choose an active ${role} account`);
    if (
      key === 'studentUserId' &&
      (await Student.exists({ studentUserId: id, ...(studentId ? { _id: { $ne: studentId } } : {}) }))
    )
      throw ApiError.conflict('Student account is already linked to another student');
  }
}

export async function listStudents(query: ListStudentsQuery, requester: AuthenticatedUser) {
  const { items, total } = await repo.findMany(query, (base) => scopeStudentFilter(base, requester));
  return {
    items: (await withLiveSummaries(items, ['Parent', 'Student'].includes(requester.role))).map((item) =>
      studentView(item, requester),
    ),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function getStudent(id: string, requester: AuthenticatedUser): Promise<StudentWithLiveSummary> {
  const student = await repo.findById(id);
  if (!student) throw ApiError.notFound('Student not found');
  assertCanReadStudent(student, requester);
  return studentView(
    (await withLiveSummaries([student], ['Parent', 'Student'].includes(requester.role)))[0],
    requester,
  );
}

export async function createStudent(input: CreateStudentInput, requester: AuthenticatedUser): Promise<IStudent> {
  await validateAccountLinks(input, requester);
  const existing = await repo.findByRefId(input.refId);
  if (existing) throw ApiError.conflict(`A student with reference ${input.refId} already exists`);
  if (!input.translations) {
    input.translations = generateStudentTranslations(input.name, input.guardianName);
  }
  const student = await repo.create(input);
  await logAudit(`Created student ${student.refId} - ${student.name}`, 'Students', requester.id);
  return student;
}

export async function updateStudent(
  id: string,
  input: UpdateStudentInput,
  requester: AuthenticatedUser,
): Promise<IStudent> {
  await validateAccountLinks(input, requester, id);
  const previous = await repo.findById(id);
  if (!previous) throw ApiError.notFound('Student not found');
  if (input.status && input.status !== previous.status && !['Administrator', 'Principal'].includes(requester.role))
    throw ApiError.forbidden('Only school administrators can change enrollment status');
  if (input.refId) {
    const duplicate = await repo.findByRefId(input.refId);
    if (duplicate && duplicate._id.toString() !== id) {
      throw ApiError.conflict(`A student with reference ${input.refId} already exists`);
    }
  }
  if (!input.translations && (input.name || input.guardianName)) {
    const studentName = input.name || previous.name;
    const guardianName = input.guardianName || previous.guardianName;
    input.translations = generateStudentTranslations(studentName, guardianName);
  }
  const updated = await repo.updateById(id, input);
  if (!updated) throw ApiError.notFound('Student not found');
  if (input.status && input.status !== previous.status) {
    await Student.updateOne(
      { _id: id },
      {
        $push: {
          enrollmentHistory: {
            from: previous.status,
            to: input.status,
            reason: 'Status updated through student record',
            effectiveDate: new Date(),
            changedAt: new Date(),
            changedBy: requester.id,
          },
        },
      },
    );
  }
  await logAudit(`Updated student ${updated.refId} - ${updated.name}`, 'Students', requester.id);
  return updated;
}

export async function deleteStudent(id: string, requester: AuthenticatedUser): Promise<void> {
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Student not found');
  const dependencies = await Promise.all([
    Attendance.exists({ student: id }),
    Invoice.exists({ student: id }),
    ExamResult.exists({ student: id }),
    BehaviourIncident.exists({ student: id }),
    ClinicVisit.exists({ student: id }),
    Loan.exists({ student: id }),
    Certificate.exists({ student: id }),
    Submission.exists({ student: id }),
    CafeteriaWallet.exists({ student: id }),
    CafeteriaAllergyPlan.exists({ student: id }),
    HostelLeave.exists({ student: id }),
    HostelRollCall.exists({ student: id }),
    AlumniProfile.exists({ student: id }),
  ]);
  if (dependencies.some(Boolean)) {
    throw ApiError.conflict(
      'Student cannot be deleted because linked school records exist; set the record to Inactive or Alumni instead',
    );
  }
  const deleted = await repo.deleteById(id);
  if (!deleted) throw ApiError.notFound('Student not found');
  await deleteDocumentFiles(existing.documents);
  await logAudit(`Deleted student ${existing.refId} - ${existing.name}`, 'Students', requester.id, 'Critical');
}
