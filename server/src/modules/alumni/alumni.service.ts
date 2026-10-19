import { AlumniProfile } from '../../models/AlumniProfile';
import { Student } from '../../models/Student';
import { Loan } from '../../models/Loan';
import { Route } from '../../models/Route';
import { HostelRoom } from '../../models/HostelRoom';
import { AuthenticatedUser } from '../../middleware/auth';
import { schoolToday } from '../attendance/attendance.dates';
import { logAudit } from '../audit/audit.service';
import { z } from 'zod';
import { updateAlumniSchema } from './alumni.validation';
import { ApiError } from '../../utils/ApiError';
import { IAlumniProfile } from '../../models/AlumniProfile';
import * as repo from './alumni.repository';
import { ListAlumniQuery, GraduateInput } from './alumni.validation';
import { Role, WRITE_ROLES } from '../../types/roles';

function canManageAlumni(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}

async function alumniScope(requester: AuthenticatedUser) {
  if (canManageAlumni(requester.role)) return {};
  const ids = ['Parent', 'Student'].includes(requester.role)
    ? await Student.find(
        requester.role === 'Parent' ? { guardianUserId: requester.id } : { studentUserId: requester.id },
      ).distinct('_id')
    : [];
  return { student: { $in: ids } };
}
export async function listAlumni(query: ListAlumniQuery, requester: AuthenticatedUser) {
  const { items, total } = await repo.findMany(query, await alumniScope(requester));
  return {
    items: items.map((item) => {
      const row = item.toObject();
      if (!canManageAlumni(requester.role)) {
        delete row.notes;
        row.history = [];
      }
      return row;
    }),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function graduate(input: GraduateInput, requester: AuthenticatedUser): Promise<IAlumniProfile> {
  if (!canManageAlumni(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may graduate a student');
  try {
    if (!input.academicCompletionConfirmed)
      throw ApiError.badRequest('Confirm school-approved academic completion before graduation');
    if (input.graduationYear > Number((await schoolToday()).slice(0, 4)))
      throw ApiError.badRequest('Graduation year cannot be in the future');
    const saved = await repo.graduateStudent(input, requester.id);
    await logAudit('Recorded graduation for student ' + input.studentId, 'Alumni', requester.id);
    return saved;
  } catch (err) {
    if (err instanceof Error) {
      const code = (err as Error & { code?: string }).code;
      if (code === 'STUDENT_NOT_FOUND') throw ApiError.notFound('Student not found');
      if (code === 'ALREADY_ALUMNI') throw ApiError.conflict('This student has already graduated');
    }
    throw err;
  }
}

export async function eligibility(id: string, requester: AuthenticatedUser) {
  if (!canManageAlumni(requester.role)) throw ApiError.forbidden('Staff graduation role required');
  const student = await Student.findById(id).select('name refId status updatedAt');
  if (!student) throw ApiError.notFound('Student not found');
  const [loans, routes, rooms] = await Promise.all([
    Loan.countDocuments({ student: id, status: { $ne: 'Returned' } }),
    Route.countDocuments({ assignedStudents: id }),
    HostelRoom.countDocuments({ occupants: id }),
  ]);
  return {
    student,
    loans,
    routes,
    rooms,
    ready: student.status === 'Active' && loans === 0 && routes === 0 && rooms === 0,
  };
}
export async function updateProfile(
  id: string,
  input: z.infer<typeof updateAlumniSchema>['body'],
  requester: AuthenticatedUser,
) {
  if (!canManageAlumni(requester.role) && requester.role !== 'Student')
    throw ApiError.forbidden('School staff or owned alumni Student account required');
  if (!canManageAlumni(requester.role) && input.notes !== undefined)
    throw ApiError.forbidden('Internal notes are school-only');
  const current = await AlumniProfile.findOne({ $and: [{ _id: id }, await alumniScope(requester)] });
  if (!current) throw ApiError.notFound('Alumni profile not found');
  const { expectedUpdatedAt, reason, ...fields } = input;
  const saved = await AlumniProfile.findOneAndUpdate(
    { _id: id, updatedAt: new Date(expectedUpdatedAt) },
    {
      $set: fields,
      $push: {
        history: {
          at: new Date(),
          by: requester.id,
          reason,
          previous: {
            currentEmployer: current.currentEmployer,
            contactEmail: current.contactEmail,
            notes: current.notes,
            allowContact: current.allowContact,
          },
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!saved) throw ApiError.conflict('Alumni profile changed; reload before reviewing');
  await logAudit('Reviewed alumni profile ' + id, 'Alumni', requester.id);
  if (!canManageAlumni(requester.role)) {
    const row = saved.toObject();
    delete row.notes;
    row.history = [];
    return row;
  }
  return saved;
}
