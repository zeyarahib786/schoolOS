import { Assignment } from '../../models/Assignment';
import { User } from '../../models/User';
import { requireTeaching } from './lms.teaching.service';
import { assignmentAudience } from './lms.audience';
import { automaticEvent } from '../notifications/notifications.automation';
import { ApiError } from '../../utils/ApiError';
export async function runAssignmentReminders(now = new Date()) {
  for (const stage of ['before', 'overdue'] as const) {
    const marker = stage === 'before' ? 'remindedBeforeFor' : 'remindedOverdueFor';
    const range =
      stage === 'before'
        ? { $gt: now, $lte: new Date(now.getTime() + 86400000) }
        : { $gte: new Date(now.getTime() - 2 * 86400000), $lte: now };
    const rows = await Assignment.find({
      status: 'Published',
      remindersEnabled: true,
      dueDate: range,
      $expr: { $ne: [{ $ifNull: ['$' + marker, null] }, '$dueDate'] },
    })
      .sort({ dueDate: 1 })
      .limit(100);
    for (const row of rows) {
      const actor = await User.findOne({
        _id: row.publisher || row.createdBy,
        isActive: true,
        role: { $in: ['Administrator', 'Principal', 'Teacher'] },
      });
      let summary = 'Reminders stopped: publisher unavailable';
      if (actor) {
        try {
          await requireTeaching({ id: String(actor._id), role: actor.role }, row.grade, row.subject, row.academicYear);
          summary = 'No pending submissions';
          for (const recipient of await assignmentAudience(String(row._id), true, row.dueDate)) {
            summary = await automaticEvent({
              recipient,
              key: 'hw:' + row._id + ':' + row.dueDate.getTime() + ':' + stage + ':' + recipient._id,
              title: stage === 'before' ? 'Homework deadline reminder' : 'Homework submission overdue',
              body:
                row.title +
                ' · ' +
                row.grade +
                ' · Deadline: ' +
                row.dueDate.toISOString() +
                '. Pending coursework only. Open Learning (LMS) in the school portal.',
              module: 'lms',
              recordId: String(row._id),
              channel: row.notifyEmail ? 'Email' : 'InApp',
              actor: { id: String(actor._id), role: actor.role },
              context: {
                lmsAssignment: String(row._id),
                lmsReminder: true,
                lmsReminderStage: stage,
                lmsReminderDue: row.dueDate.toISOString(),
              },
            });
          }
        } catch (e) {
          if (!(e instanceof ApiError)) throw e;
          summary = 'Reminders stopped: teaching access changed';
        }
      }
      await Assignment.updateOne(
        { _id: row._id, status: 'Published', dueDate: row.dueDate, remindersEnabled: true },
        { $set: { [marker]: row.dueDate, reminderSummary: summary } },
        { timestamps: false },
      );
    }
  }
}
