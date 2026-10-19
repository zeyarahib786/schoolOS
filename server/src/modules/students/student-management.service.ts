import mongoose from 'mongoose';
import { z } from 'zod';
import { Student } from '../../models/Student';
import { User } from '../../models/User';
import { ApiError } from '../../utils/ApiError';
import { AuthenticatedUser } from '../../middleware/auth';
import { logAudit } from '../audit/audit.service';
import { accountsSchema, enrollmentSchema, importStudentsSchema } from './student.validation';

export async function importStudents(
  input: z.infer<typeof importStudentsSchema>['body'],
  requester: AuthenticatedUser,
) {
  const refs = input.students.map((s) => s.refId);
  if (new Set(refs).size !== refs.length) throw ApiError.conflict('CSV contains duplicate admission numbers');
  const existing = await Student.find({ refId: { $in: refs } })
    .collation({ locale: 'en', strength: 2 })
    .select('refId');
  if (existing.length)
    throw ApiError.conflict(`Admission numbers already exist: ${existing.map((s) => s.refId).join(', ')}`);
  const session = await mongoose.startSession();
  let ids: string[] = [];
  try {
    await session.withTransaction(async () => {
      const records = await Student.insertMany(input.students, { session, ordered: true });
      ids = records.map((r) => r._id.toString());
    });
  } finally {
    await session.endSession();
  }
  await logAudit(`Imported ${ids.length} students from CSV`, 'Students', requester.id);
  return { count: ids.length, ids };
}

export async function changeEnrollment(
  id: string,
  input: z.infer<typeof enrollmentSchema>['body'],
  requester: AuthenticatedUser,
) {
  const student = await Student.findById(id);
  if (!student) throw ApiError.notFound('Student not found');
  if (student.status === input.status) throw ApiError.conflict('Student already has this enrollment status');
  const result = await Student.findOneAndUpdate(
    { _id: id, status: student.status },
    {
      $set: { status: input.status },
      $push: {
        enrollmentHistory: {
          from: student.status,
          to: input.status,
          reason: input.reason,
          effectiveDate: input.effectiveDate,
          changedAt: new Date(),
          changedBy: requester.id,
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!result) throw ApiError.conflict('Student changed; refresh and try again');
  await logAudit(
    `Enrollment ${student.refId}: ${student.status} → ${input.status} (${input.reason})`,
    'Students',
    requester.id,
  );
  return result;
}

export async function linkAccounts(
  id: string,
  input: z.infer<typeof accountsSchema>['body'],
  requester: AuthenticatedUser,
) {
  if (!(await Student.exists({ _id: id }))) throw ApiError.notFound('Student not found');
  const set: Record<string, string> = {},
    unset: Record<string, string> = {};
  for (const [emailKey, linkKey, role] of [
    ['parentEmail', 'guardianUserId', 'Parent'],
    ['studentEmail', 'studentUserId', 'Student'],
  ] as const) {
    if (input[emailKey] === undefined) continue;
    if (input[emailKey] === null) {
      unset[linkKey] = '';
      continue;
    }
    const user = await User.findOne({ email: input[emailKey]!.toLowerCase(), role, isActive: true });
    if (!user) throw ApiError.badRequest(`No active ${role} account matches that email`);
    if (role === 'Student' && (await Student.exists({ studentUserId: user._id, _id: { $ne: id } })))
      throw ApiError.conflict('Student account is already linked to another student');
    set[linkKey] = user._id.toString();
  }
  const student = await Student.findByIdAndUpdate(id, { $set: set, $unset: unset }, { new: true, runValidators: true });
  await logAudit(`Updated portal links for ${student!.refId}`, 'Students', requester.id);
  return student;
}
