import { TeacherAiDraft } from '../../models/TeacherAiDraft';
import { Student } from '../../models/Student';
import { User } from '../../models/User';
import { teacherScope } from './lms.teaching.service';
/** Recheck a queued AI parent message after school-office approval, immediately before delivery. */
export async function teacherAiRecipientValid(draftId: string, recipientId: string) {
  const draft = await TeacherAiDraft.findById(draftId);
  if (!draft || draft.status !== 'Applied' || draft.request.kind !== 'ParentMessage') return false;
  const sender = await User.findOne({ _id: draft.owner, isActive: true });
  if (!sender || !['Administrator', 'Principal', 'Teacher'].includes(sender.role)) return false;
  if (
    sender.role === 'Teacher' &&
    !(await teacherScope({ id: String(sender._id), role: sender.role })).some(
      (s) =>
        s.grade === draft.request.grade &&
        s.subject === draft.request.subject &&
        s.academicYear === draft.request.academicYear,
    )
  )
    return false;
  return !!(await Student.exists({
    _id: draft.request.studentId,
    grade: draft.request.grade,
    status: 'Active',
    guardianUserId: recipientId,
  }));
}
