import { PortalLoginId } from '../../models/PortalLoginId';
import { getSettings } from '../settings/settings.repository';
import { recordLoginId, studentLoginId } from './auth.login-id';
import { randomBytes } from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../../models/User';
import { Student } from '../../models/Student';
import { Staff } from '../../models/Staff';
import { Guardian } from '../../models/Guardian';
import { ClassSection } from '../../models/ClassSection';
import { TeachingAssignment } from '../../models/TeachingAssignment';
import { ApiError } from '../../utils/ApiError';
import { logAudit } from '../audit/audit.service';
import { AuthenticatedUser } from '../../middleware/auth';

export async function accountDirectory(query: string, grade = '') {
  const { academicYear } = await getSettings();
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = escaped ? { $or: [{ name: new RegExp(escaped, 'i') }, { refId: new RegExp(escaped, 'i') }] } : {};
  const studentIds = grade ? await Student.find({ grade }).distinct('_id') : [];
  const [students, staff, guardians, studentGrades, sections] = await Promise.all([
    Student.find({ ...filter, ...(grade ? { grade } : {}) })
      .select('name refId grade roll studentEmail status studentUserId')
      .sort({ name: 1 })
      .limit(50)
      .lean(),
    Staff.find(filter).select('name refId designation email status type userId').sort({ name: 1 }).limit(50).lean(),
    Guardian.find({ ...filter, ...(grade ? { studentIds: { $in: studentIds } } : {}) })
      .select('name refId email portalStatus userId')
      .sort({ name: 1 })
      .limit(50)
      .lean(),
    Student.distinct('grade'),
    ClassSection.find({ status: 'Active' }).select('grade section').lean(),
  ]);
  const classes = [...new Set([...studentGrades, ...sections.map((s) => s.grade + ' · ' + s.section)])].sort((a, b) =>
    a.localeCompare(b, 'en', { numeric: true }),
  );
  const preview = <T extends { refId: string; grade?: string; roll?: string }>(kind: 'Student' | 'Staff' | 'Guardian', rows: T[]) =>
    rows.map((row) => {
      try {
        return { ...row, proposedLoginId: (kind === 'Student' ? studentLoginId(row.grade || '', row.roll || '', academicYear) : recordLoginId(kind, row.refId)).toUpperCase() };
      } catch {
        return { ...row, proposedLoginId: null };
      }
    });
  return {
    students: preview('Student', students),
    staff: preview('Staff', staff),
    guardians: preview('Guardian', guardians),
    classes,
  };
}

export async function provisionAccount(
  input: {
    kind: 'Student' | 'Staff' | 'Guardian';
    recordId: string;
    role?: 'Teacher' | 'Principal' | 'Accountant';
    email?: string;
  },
  actor: string,
) {
  const { academicYear } = await getSettings();
  const session = await mongoose.startSession();
  const temporaryPassword = 'Aa9!' + randomBytes(15).toString('base64url');
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  let result: Record<string, unknown> = {};
  try {
    await session.withTransaction(async () => {
      const record =
        input.kind === 'Student'
          ? await Student.findById(input.recordId).session(session)
          : input.kind === 'Staff'
            ? await Staff.findById(input.recordId).session(session)
            : await Guardian.findById(input.recordId).session(session);
      if (!record) throw ApiError.notFound('School record not found');
      const link = input.kind === 'Student' ? 'studentUserId' : 'userId';
      if (record.get(link)) throw ApiError.conflict('This record already has a login. Use reset credentials instead.');
      if (
        record.get('status') === 'Inactive' ||
        record.get('status') === 'Alumni' ||
        record.get('portalStatus') === 'Suspended'
      )
        throw ApiError.conflict('Activate the school record before creating a login');
      const role = input.kind === 'Student' ? 'Student' : input.kind === 'Guardian' ? 'Parent' : input.role;
      if (!role) throw ApiError.badRequest('Choose the staff portal role');
      if (role === 'Teacher' && record.get('type') !== 'Teaching')
        throw ApiError.badRequest('Teacher accounts require a Teaching staff record');
      const loginId = input.kind === 'Student'
        ? studentLoginId(record.get('grade'), record.get('roll'), academicYear)
        : recordLoginId(input.kind, record.refId);
      if (await PortalLoginId.exists({ loginId }).session(session))
        throw ApiError.conflict(
          'This login ID was already issued and cannot be reused. Review the class, roll number and school reference; issued IDs cannot be reused.',
        );
      await PortalLoginId.create([{ loginId, recordKind: input.kind, recordId: record._id }], { session });
      const requestedEmail = input.email?.trim().toLowerCase();
      if (requestedEmail?.endsWith('@accounts.schoolos.invalid'))
        throw ApiError.badRequest('Use a real personal or school email, or choose Login ID only');
      if (input.kind === 'Student' && requestedEmail) {
        const guardianEmail = record.get('guardianEmail')?.toLowerCase();
        if (
          requestedEmail === guardianEmail ||
          (await Guardian.exists({ studentIds: record._id, email: requestedEmail }).session(session))
        )
          throw ApiError.badRequest(
            'Use the student’s own email. Parent or guardian email belongs in school contact details; choose Login ID only if the student has no email.',
          );
      }
      const email = requestedEmail || loginId + '@accounts.schoolos.invalid';
      if (await User.exists({ email }).session(session))
        throw ApiError.conflict(
          'This email already has an account. Use the existing portal-link workflow; credentials were not changed.',
        );
      const [user] = await User.create(
        [
          {
            name: record.name,
            email,
            loginId,
            role,
            passwordHash,
            mustChangePassword: true,
            temporaryPasswordExpiresAt: new Date(Date.now() + 7 * 86400000),
          },
        ],
        { session },
      );
      record.set(link, user._id);
      if (input.kind === 'Guardian') {
        const ids = record.get('studentIds');
        if (
          await Student.exists({
            _id: { $in: ids },
            guardianUserId: { $exists: true, $nin: [null, user._id] },
          }).session(session)
        )
          throw ApiError.conflict('A child already has another parent portal link. Review guardian links first.');
        await Student.updateMany({ _id: { $in: ids } }, { $set: { guardianUserId: user._id } }, { session });
        record.set('portalStatus', 'Active');
      }
      await record.save({ session });
      result = {
        userId: user._id,
        name: user.name,
        role,
        loginId,
        email,
        temporaryPassword,
        expiresAt: user.temporaryPasswordExpiresAt,
      };
    });
  } finally {
    await session.endSession();
  }
  await logAudit('Provisioned ' + input.kind + ' portal account for record ' + input.recordId, 'Auth', actor);
  return result;
}

export async function resetAccount(id: string, actor: string) {
  if (id === actor) throw ApiError.badRequest('Use My profile to change your own password');
  const temporaryPassword = 'Aa9!' + randomBytes(15).toString('base64url');
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const user = await User.findOneAndUpdate(
    { _id: id, role: { $ne: 'Administrator' }, isActive: true },
    {
      $set: { passwordHash, mustChangePassword: true, temporaryPasswordExpiresAt: new Date(Date.now() + 7 * 86400000) },
      $inc: { refreshTokenVersion: 1 },
    },
    { new: true },
  );
  if (!user) throw ApiError.notFound('Active managed account not found');
  await logAudit('Reset portal credentials for user ' + id, 'Auth', actor);
  return {
    userId: user._id,
    name: user.name,
    role: user.role,
    loginId: user.loginId,
    email: user.email,
    temporaryPassword,
    expiresAt: user.temporaryPasswordExpiresAt,
  };
}

export async function ownProfile(actor: AuthenticatedUser) {
  const user = await User.findById(actor.id).select('name email loginId role createdAt mustChangePassword').lean();
  if (!user) throw ApiError.notFound('Account not found');
  if (user.mustChangePassword) return { user, students: [], staff: null, guardian: null, teaching: [] };
  const students =
    actor.role === 'Student' || actor.role === 'Parent'
      ? await Student.find(actor.role === 'Student' ? { studentUserId: actor.id } : { guardianUserId: actor.id })
          .select('name refId grade roll status gender dateOfBirth guardianName phone guardianEmail address')
          .lean()
      : [];
  const staff = await Staff.findOne({ userId: actor.id })
    .select('name refId designation department type status phone email joinedDate')
    .lean();
  const guardian =
    actor.role === 'Parent'
      ? await Guardian.findOne({ userId: actor.id }).select('name refId relation phone email portalStatus').lean()
      : null;
  const teaching =
    actor.role === 'Teacher'
      ? await TeachingAssignment.find({ teacher: actor.id, active: true }).select('grade subject academicYear').lean()
      : [];
  return { user, students, staff, guardian, teaching };
}

export async function changeOwnPassword(id: string, currentPassword: string, newPassword: string) {
  const user = await User.findById(id).select('+passwordHash');
  if (!user || !(await user.comparePassword(currentPassword)))
    throw ApiError.unauthorized('Current password is incorrect');
  if (await user.comparePassword(newPassword)) throw ApiError.badRequest('Choose a different new password');
  const result = await User.updateOne(
    { _id: id, passwordHash: user.passwordHash, refreshTokenVersion: user.refreshTokenVersion },
    {
      $set: { passwordHash: await bcrypt.hash(newPassword, 12), mustChangePassword: false },
      $unset: { temporaryPasswordExpiresAt: 1 },
      $inc: { refreshTokenVersion: 1 },
    },
  );
  if (!result.modifiedCount) throw ApiError.conflict('Account changed; sign in again');
  await logAudit('Changed own password; all sessions revoked', 'Auth', id);
  return { message: 'Password changed. Sign in again with your new password.' };
}

export async function managedAccount(id: string) {
  const user = await User.findById(id).select('name email loginId role isActive updatedAt').lean();
  if (!user) throw ApiError.notFound('Account not found');
  return user;
}

export async function correctAccount(
  id: string,
  input: { name: string; email: string; expectedUpdatedAt: string; reason: string },
  actor: string,
) {
  const current = await User.findById(id);
  if (!current) throw ApiError.notFound('Account not found');
  if (current.updatedAt.toISOString() !== input.expectedUpdatedAt)
    throw ApiError.conflict('Account changed. Refresh before saving.');
  const email = input.email.toLowerCase();
  if (await User.exists({ _id: { $ne: id }, email }))
    throw ApiError.conflict('This email is already used by another account');
  const sessionRevoked = current.email !== email;
  const updated = await User.findOneAndUpdate(
    { _id: id, updatedAt: new Date(input.expectedUpdatedAt) },
    {
      $set: { name: input.name, email },
      ...(sessionRevoked ? { $inc: { refreshTokenVersion: 1 } } : {}),
    },
    { new: true, runValidators: true },
  ).select('name email loginId role updatedAt');
  if (!updated) throw ApiError.conflict('Account changed. Refresh before saving.');
  await logAudit('Corrected login account ' + id + ': ' + input.reason, 'Auth', actor);
  return { user: updated, sessionRevoked };
}
