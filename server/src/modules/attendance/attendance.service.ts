import { teacherScope } from '../lms/lms.teaching.service';
import { getSettings } from '../settings/settings.repository';
import { schoolToday } from './attendance.dates';
import mongoose from 'mongoose';
import { AbsenceRequest } from '../../models/AbsenceRequest';
import { Attendance } from '../../models/Attendance';
import { SaveRegisterInput } from './attendance.validation';
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
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function daysInclusive(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
}

function canReviewAbsence(role: AuthenticatedUser['role']): boolean {
  return ABSENCE_REVIEW_ROLES.includes(role as (typeof ABSENCE_REVIEW_ROLES)[number]);
}

async function assertCanUseStudentForAbsence(studentId: string, requester: AuthenticatedUser) {
  const student = await Student.findById(studentId).select('name refId grade guardianUserId status');
  if (!student) throw ApiError.notFound('Student not found');
  if (student.status !== 'Active') throw ApiError.conflict('Absence requests require an active student');
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

  await validateStudents(input);
  const date = dayStart(input.date);
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

  await validateStudents(input);
  const date = dayStart(input.date);
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
  if (!STAFF_ATTENDANCE_ROLES.includes(requester.role as (typeof STAFF_ATTENDANCE_ROLES)[number])) {
    throw ApiError.forbidden('Only staff users may view staff attendance');
  }
  const date = dayStart(query.date || (await schoolToday()));
  const unrestricted =
    requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Accountant';
  const filter = unrestricted ? { date } : { date, user: requester.id };
  const items = await repo.findStaffAttendance(filter);
  return { items, date: date.toISOString().slice(0, 10) };
}

export async function markStaffAttendance(input: MarkStaffAttendanceInput, requester: AuthenticatedUser) {
  if (!STAFF_ATTENDANCE_ROLES.includes(requester.role as (typeof STAFF_ATTENDANCE_ROLES)[number])) {
    throw ApiError.forbidden('Only staff users may mark staff attendance');
  }
  const user = await User.findById(requester.id).select('name');
  if (!user) throw ApiError.notFound('User not found');
  const date = dayStart(input.date || (await schoolToday()));
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
  if (
    await AbsenceRequest.exists({
      student: input.studentId,
      status: { $in: ['Pending', 'Approved'] },
      fromDate: { $lte: toDate },
      toDate: { $gte: fromDate },
    })
  )
    throw ApiError.conflict('An overlapping pending or approved absence request already exists');
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
  const updated = await AbsenceRequest.findOneAndUpdate(
    { _id: id, status: 'Pending' },
    { $set: { status: 'Cancelled', decidedAt: new Date() } },
    { new: true },
  );
  if (!updated) throw ApiError.conflict('Request was already reviewed');
  await logAudit('Cancelled absence request', 'Attendance', requester.id);
  return updated;
}

export async function decideAbsenceRequest(id: string, input: DecideAbsenceRequestInput, requester: AuthenticatedUser) {
  if (!canReviewAbsence(requester.role)) throw ApiError.forbidden('Only teaching staff may review absence requests');
  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      const request = await AbsenceRequest.findById(id).session(session);
      if (!request) throw ApiError.notFound('Absence request not found');
      if (request.status !== 'Pending') throw ApiError.conflict('Only pending requests can be reviewed');
      updated = await AbsenceRequest.findOneAndUpdate(
        { _id: id, status: 'Pending' },
        {
          $set: {
            status: input.decision,
            decidedBy: requester.id,
            decisionNote: input.note || '',
            decidedAt: new Date(),
          },
        },
        { new: true, session },
      );
      if (!updated) throw ApiError.conflict('Request was already reviewed');
      if (input.decision === 'Approved') {
        for (
          const d = dayStart(request.fromDate.toISOString());
          d <= request.toDate;
          d.setUTCDate(d.getUTCDate() + 1)
        ) {
          for (const period of ['AM', 'PM'] as const) {
            const key = { student: request.student, date: new Date(d), session: period };
            const existing = await Attendance.findOne(key).session(session);
            if (!existing || existing.status === 'Absent')
              await Attendance.updateOne(
                key,
                { $set: { status: 'Excused', markedBy: requester.id, notes: `Approved absence request ${id}` } },
                { upsert: true, session },
              );
          }
        }
      }
    });
  } finally {
    await session.endSession();
  }
  await logAudit(`${input.decision} absence request`, 'Attendance', requester.id);
  return updated;
}

async function validateStudents(input: MarkAttendanceInput) {
  const ids = input.entries.map((e) => e.studentId);
  if (new Set(ids).size !== ids.length) throw ApiError.badRequest('Duplicate students in register');
  if ((await Student.countDocuments({ _id: { $in: ids }, status: 'Active' })) !== ids.length)
    throw ApiError.badRequest('Register must contain existing active students');
}
export async function saveCheckedRegister(input: SaveRegisterInput, requester: AuthenticatedUser) {
  if (!canMarkAttendance(requester.role)) throw ApiError.forbidden('Only teaching staff may save registers');
  if (input.date > (await schoolToday())) throw ApiError.badRequest('Future registers cannot be marked');
  await validateStudents(input);
  if (input.notifyGuardians && input.date !== (await schoolToday()))
    throw ApiError.badRequest('Parent alerts are available only for today’s register');
  if (input.notifyGuardians && requester.role === 'Teacher') {
    const scopes = await teacherScope(requester),
      year = (await getSettings()).academicYear;
    const allowed = scopes.filter((s) => s.academicYear === year).map((s) => s.grade);
    if (await Student.exists({ _id: { $in: input.entries.map((e) => e.studentId) }, grade: { $nin: allowed } }))
      throw ApiError.forbidden('Parent alerts require an assigned class in the current academic year');
  }
  const session = await mongoose.startSession();
  let changed = 0;
  try {
    await session.withTransaction(async () => {
      changed = 0;
      for (const e of input.entries) {
        const key = { student: e.studentId, date: dayStart(input.date), session: input.session };
        const existing = await Attendance.findOne(key).session(session);
        if ((existing?.updatedAt.toISOString() || null) !== e.expectedUpdatedAt)
          throw ApiError.conflict('Register changed by another user. Reload before saving');
        if (existing && (existing.status !== e.status || (existing.notes || '') !== (e.notes || ''))) {
          if (!input.correctionReason) throw ApiError.badRequest('Provide a reason for correcting saved attendance');
          changed++;
        }
        if (
          !existing ||
          existing.status !== e.status ||
          (existing.notes || '') !== (e.notes || '') ||
          input.notifyGuardians
        )
          await Attendance.updateOne(
            key,
            {
              $set: {
                status: e.status,
                notes: e.notes || '',
                markedBy: requester.id,
                ...(input.notifyGuardians && ['Absent', 'Late'].includes(e.status)
                  ? { alertRequestedAt: new Date(), alertProcessedAt: null, alertChannel: input.notificationChannel }
                  : {}),
              },
            },
            { upsert: true, session },
          );
      }
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw ApiError.conflict('Register changed. Reload before saving');
    throw error;
  } finally {
    await session.endSession();
  }
  await logAudit(
    `Saved ${input.entries.length} ${input.session} records on ${input.date}${changed ? `; corrected ${changed}: ${input.correctionReason}` : ''}`,
    'Attendance',
    requester.id,
    changed ? 'Warning' : 'Info',
  );
  return { markedCount: input.entries.length, correctedCount: changed };
}
