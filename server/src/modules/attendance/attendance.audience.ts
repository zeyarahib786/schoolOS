import { Attendance } from '../../models/Attendance';
import { Student } from '../../models/Student';
import { User } from '../../models/User';
import { Guardian } from '../../models/Guardian';
export async function attendanceAlertAudience(id: string, status?: string) {
  const row = await Attendance.findById(id);
  if (!row || !['Absent', 'Late'].includes(row.status) || (status && row.status !== status)) return [];
  const child = await Student.findOne({ _id: row.student, status: 'Active' });
  if (!child?.guardianUserId) return [];
  if (await Guardian.exists({ userId: child.guardianUserId, portalStatus: 'Suspended' })) return [];
  return User.find({ _id: child.guardianUserId, role: 'Parent', isActive: true }).select('_id email');
}
