import { TeachingAssignment } from '../../models/TeachingAssignment';
import { ClassSection } from '../../models/ClassSection';
import { User } from '../../models/User';
import { AuthenticatedUser } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { logAudit } from '../audit/audit.service';
export async function teacherMappings(user: AuthenticatedUser) {
  const classes = user.role === 'Teacher' ? await ClassSection.find({ status: 'Active' }).select('_id') : null;
  return TeachingAssignment.find(
    user.role === 'Teacher'
      ? { teacher: user.id, active: true, classSection: { $in: classes!.map((c) => c._id) } }
      : {},
  )
    .populate('teacher', 'name')
    .sort({ grade: 1, subject: 1 });
}
export async function teacherScope(user: AuthenticatedUser) {
  const rows = await TeachingAssignment.find({ teacher: user.id, active: true });
  const active = await ClassSection.find({ _id: { $in: rows.map((r) => r.classSection) }, status: 'Active' }).select(
    '_id',
  );
  const valid = new Set(active.map((r) => String(r._id)));
  return rows
    .filter((r) => valid.has(String(r.classSection)))
    .map((r) => ({ grade: r.grade, subject: r.subject, academicYear: r.academicYear }));
}
export async function requireTeaching(user: AuthenticatedUser, grade: string, subject: string, year: string) {
  if (user.role !== 'Teacher') return;
  if (!(await teacherScope(user)).some((r) => r.grade === grade && r.subject === subject && r.academicYear === year))
    throw ApiError.forbidden('This class, subject and academic year are not assigned to your teacher account');
}
export async function assignTeaching(
  input: { teacher: string; classSection: string; subject: string; academicYear: string },
  user: AuthenticatedUser,
) {
  const [teacher, section] = await Promise.all([
    User.findOne({ _id: input.teacher, role: 'Teacher', isActive: true }),
    ClassSection.findOne({ _id: input.classSection, status: 'Active' }),
  ]);
  if (!teacher || !section) throw ApiError.badRequest('Select an active teacher account and class section');
  const row = await TeachingAssignment.findOneAndUpdate(
    { ...input },
    { $set: { grade: section.grade + ' · ' + section.section, active: true } },
    { upsert: true, new: true, runValidators: true },
  );
  await logAudit('Assigned teaching class ' + row.grade + ' / ' + row.subject, 'LMS', user.id);
  return row;
}
export async function teachingOptions() {
  return {
    teachers: await User.find({ role: 'Teacher', isActive: true }).select('_id name'),
    classes: await ClassSection.find({ status: 'Active' }).select('_id grade section'),
  };
}
