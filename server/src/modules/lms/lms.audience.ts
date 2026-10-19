import { Submission } from '../../models/Submission';
import { Assignment } from '../../models/Assignment';
import { Student } from '../../models/Student';
import { User } from '../../models/User';
import { Guardian } from '../../models/Guardian';
export async function assignmentAudience(
  id: string,
  pendingOnly = false,
  expectedDeadline?: Date,
  stage?: 'before' | 'overdue',
) {
  const assignment = await Assignment.findOne({ _id: id, status: 'Published' });
  if (
    !assignment ||
    (pendingOnly &&
      (!assignment.remindersEnabled ||
        (expectedDeadline && assignment.dueDate.getTime() !== expectedDeadline.getTime())))
  )
    return [];
  if (stage === 'before' && assignment.dueDate <= new Date()) return [];
  if (stage === 'overdue' && assignment.dueDate > new Date()) return [];
  const submitted = pendingOnly ? await Submission.distinct('student', { assignment: id }) : [];
  const students = await Student.find({
    grade: assignment.grade,
    status: 'Active',
    ...(pendingOnly ? { _id: { $nin: submitted } } : {}),
  }).select('studentUserId guardianUserId');
  const studentIds = students.flatMap((s) => (s.studentUserId ? [s.studentUserId] : [])),
    parentIds = students.flatMap((s) => (s.guardianUserId ? [s.guardianUserId] : []));
  const suspended = await Guardian.find({ userId: { $in: parentIds }, portalStatus: 'Suspended' }).select('userId');
  return User.find({
    isActive: true,
    _id: { $nin: suspended.map((g) => g.userId) },
    $or: [
      { _id: { $in: studentIds }, role: 'Student' },
      { _id: { $in: parentIds }, role: 'Parent' },
    ],
  }).select('_id email role');
}
