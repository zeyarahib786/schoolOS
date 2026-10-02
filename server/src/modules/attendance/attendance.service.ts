import { ApiError } from '../../utils/ApiError';
import * as repo from './attendance.repository';
import { User } from '../../models/User';
import { Student } from '../../models/Student';
import {
  ListAttendanceQuery,
  MarkAttendanceInput,
  ListStaffAttendanceQuery,
  MarkStaffAttendanceInput,
  ListAbsenceRequestsQuery,
  CreateAbsenceRequestInput,
  DecideAbsenceRequestInput,
} from './attendance.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeAttendanceFilter, canMarkAttendance } from './attendance.ownership';
import { logAudit } from '../audit/audit.service';

const STAFF_ATTENDANCE_ROLES = ['Administrator', 'Principal', 'Teacher', 'Accountant'] as const;
const ABSENCE_REVIEW_ROLES = ['Administrator', 'Principal', 'Teacher'] as const;

function dayStart(value?: string): Date {
  const d = value ? new Date(value) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysInclusive(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
}

function canReviewAbsence(role: AuthenticatedUser['role']): boolean {
  return ABSENCE_REVIEW_ROLES.includes(role as typeof ABSENCE_REVIEW_ROLES[number]);
}

async function assertCanUseStudentForAbsence(studentId: string, requester: AuthenticatedUser) {
  const student = await Student.findById(studentId).select('name refId grade guardianUserId');
  if (!student) throw ApiError.notFound('Student not found');
  if (canReviewAbsence(requester.role)) return student;
  if (requester.role === 'Parent' && student.guardianUserId?.toString() === requester.id) return student;
  throw ApiError.notFound('Student not found');
}

export async function listAttendance(query: ListAttendanceQuery, requester: AuthenticatedUser) {
  const authorizedStudentIds =
    requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Teacher'
      ? []
      : await repo.findAuthorizedStudentIds(requester.id);

  const { items, total } = await repo.findMany(query, (base) =>
    scopeAttendanceFilter(base, requester, authorizedStudentIds),
  );
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

/**
 * Marks attendance for a whole class in one call - real-world usage is a teacher taking
 * attendance once per session for every student in the room, not one HTTP request per student.
 * Rejects the ENTIRE batch if any entry would violate the (student, date, session) uniqueness
 * constraint, rather than silently skipping duplicates - a teacher re-submitting a form for a
 * session they already marked should get a clear error, not a partial, confusing re-mark.
 */
export async function markAttendance(input: MarkAttendanceInput, requester: AuthenticatedUser) {
  if (!canMarkAttendance(requester.role)) {
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may mark attendance');
  }

  const date = new Date(input.date);
  const studentIds = input.entries.map((e) => e.studentId);
  const existing = await repo.findExistingForEntries(date, input.session, studentIds);
  if (existing.length > 0) {
    const already = existing.map((e) => e.student.toString());
    throw ApiError.conflict(
      `Attendance already marked for ${already.length} student(s) in this session - ${already.join(', ')}`,
    );
  }

  const records = input.entries.map((e) => ({
    student: e.studentId,
    date,
    session: input.session,
    status: e.status,
    markedBy: requester.id,
    notes: e.notes,
  }));
  const created = await repo.bulkCreate(records);
  await logAudit(
    `Marked ${created.length} attendance record(s) for ${input.session} on ${input.date}`,
    'Attendance',
    requester.id,
  );
  return { markedCount: created.length };
}

/**
 * Saves the live classroom register exactly as it appears on screen. Unlike the first-time
 * mark endpoint above, this is intentionally idempotent so a teacher/admin can correct a saved
 * register without creating duplicate rows.
 */
export async function saveRegister(input: MarkAttendanceInput, requester: AuthenticatedUser) {
  if (!canMarkAttendance(requester.role)) {
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may save attendance');
  }

  const date = new Date(input.date);
  const records = input.entries.map((e) => ({
    student: e.studentId,
    date,
    session: input.session,
    status: e.status,
    markedBy: requester.id,
    notes: e.notes,
  }));
  const result = await repo.bulkUpsert(records);
  await logAudit(
    `Saved ${input.entries.length} attendance record(s) for ${input.session} on ${input.date}`,
    'Attendance',
    requester.id,
    result.modifiedCount ? 'Warning' : 'Info',
  );
  return { markedCount: input.entries.length, updatedCount: result.modifiedCount, createdCount: result.upsertedCount };
}

export async function listStaffAttendance(query: ListStaffAttendanceQuery, requester: AuthenticatedUser) {
  if (!STAFF_ATTENDANCE_ROLES.includes(requester.role as typeof STAFF_ATTENDANCE_ROLES[number])) {
    throw ApiError.forbidden('Only staff users may view staff attendance');
  }
  const date = dayStart(query.date);
  const unrestricted = requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Accountant';
  const filter = unrestricted ? { date } : { date, user: requester.id };
  const items = await repo.findStaffAttendance(filter);
  return { items, date: date.toISOString().slice(0, 10) };
}

export async function markStaffAttendance(input: MarkStaffAttendanceInput, requester: AuthenticatedUser) {
  if (!STAFF_ATTENDANCE_ROLES.includes(requester.role as typeof STAFF_ATTENDANCE_ROLES[number])) {
    throw ApiError.forbidden('Only staff users may mark staff attendance');
  }
  const user = await User.findById(requester.id).select('name');
  if (!user) throw ApiError.notFound('User not found');
  const date = dayStart(input.date);
  const entry = await repo.saveStaffAttendance({
    userId: requester.id,
    name: user.name,
    role: requester.role,
    date,
    status: input.status,
  });
  await logAudit(`Marked own staff attendance - ${input.status}`, 'Attendance', requester.id);
  return entry;
}

export async function listAbsenceRequests(query: ListAbsenceRequestsQuery, requester: AuthenticatedUser) {
  const filter: Record<string, unknown> = {};
  if (!canReviewAbsence(requester.role)) {
    const authorizedStudentIds = await repo.findAuthorizedStudentIds(requester.id);
    filter.student = { $in: authorizedStudentIds };
  }
  const { items, total } = await repo.findAbsenceRequests(query, filter);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function createAbsenceRequest(input: CreateAbsenceRequestInput, requester: AuthenticatedUser) {
  const student = await assertCanUseStudentForAbsence(input.studentId, requester);
  const fromDate = dayStart(input.fromDate);
  const toDate = dayStart(input.toDate);
  const days = daysInclusive(fromDate, toDate);
  if (days < 1) throw ApiError.badRequest('To date must be on or after from date');
  if (days > 60) throw ApiError.badRequest('Absence requests cannot exceed 60 days');
  const created = await repo.createAbsenceRequest({
    student: input.studentId,
    requestedBy: requester.id,
    fromDate,
    toDate,
    days,
    type: input.type,
    note: input.note,
  });
  await logAudit(`Requested absence for ${student.refId} (${days} day(s))`, 'Attendance', requester.id);
  return created.populate([
    { path: 'student', select: 'name refId grade guardianUserId' },
    { path: 'requestedBy', select: 'name role' },
  ]);
}

export async function cancelAbsenceRequest(id: string, requester: AuthenticatedUser) {
  const request = await repo.findAbsenceRequestById(id);
  if (!request) throw ApiError.notFound('Absence request not found');
  if (request.status !== 'Pending') throw ApiError.conflict('Only pending absence requests can be cancelled');
  if (!canReviewAbsence(requester.role) && request.requestedBy.toString() !== requester.id) {
    throw ApiError.notFound('Absence request not found');
  }
  const updated = await repo.updateAbsenceRequestStatus(id, { status: 'Cancelled', decidedAt: new Date() });
  await logAudit('Cancelled absence request', 'Attendance', requester.id);
  return updated;
}

export async function decideAbsenceRequest(id: string, input: DecideAbsenceRequestInput, requester: AuthenticatedUser) {
  if (!canReviewAbsence(requester.role)) throw ApiError.forbidden('Only Administrator, Principal, or Teacher may review absence requests');
  const request = await repo.findAbsenceRequestById(id);
  if (!request) throw ApiError.notFound('Absence request not found');
  if (request.status !== 'Pending') throw ApiError.conflict('Only pending absence requests can be reviewed');
  const updated = await repo.updateAbsenceRequestStatus(id, {
    status: input.decision,
    decidedBy: requester.id,
    decisionNote: input.note,
    decidedAt: new Date(),
  });
  if (input.decision === 'Approved') {
    const studentId = request.student._id.toString();
    const records = [];
    for (let d = dayStart(request.fromDate.toISOString()); d <= request.toDate; d.setDate(d.getDate() + 1)) {
      const date = new Date(d);
      records.push(
        { student: studentId, date, session: 'AM' as const, status: 'Excused' as const, markedBy: requester.id, notes: `Approved absence request ${request._id}` },
        { student: studentId, date, session: 'PM' as const, status: 'Excused' as const, markedBy: requester.id, notes: `Approved absence request ${request._id}` },
      );
    }
    await repo.bulkUpsert(records);
  }
  await logAudit(`${input.decision} absence request`, 'Attendance', requester.id, input.decision === 'Approved' ? 'Warning' : 'Info');
  return updated;
}
