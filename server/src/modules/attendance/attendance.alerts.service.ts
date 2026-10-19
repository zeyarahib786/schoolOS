import { Attendance } from '../../models/Attendance';
import { Student } from '../../models/Student';
import { User } from '../../models/User';
import { attendanceAlertAudience } from './attendance.audience';
import { teacherScope } from '../lms/lms.teaching.service';
import { getSettings } from '../settings/settings.repository';
import { automaticEvent } from '../notifications/notifications.automation';
export async function runAttendanceAlerts() {
  const rows = await Attendance.find({ alertRequestedAt: { $type: 'date' }, alertProcessedAt: null })
    .sort({ alertRequestedAt: 1 })
    .limit(100);
  for (const row of rows) {
    const actor = await User.findOne({
        _id: row.markedBy,
        isActive: true,
        role: { $in: ['Administrator', 'Principal', 'Teacher'] },
      }),
      child = await Student.findById(row.student);
    let allowed = !!actor && !!child;
    if (allowed && actor!.role === 'Teacher') {
      const year = (await getSettings()).academicYear;
      allowed = (await teacherScope({ id: String(actor!._id), role: 'Teacher' })).some(
        (m) => m.grade === child!.grade && m.academicYear === year,
      );
    }
    let summary = 'No eligible guardian alert';
    if (allowed) {
      for (const recipient of await attendanceAlertAudience(String(row._id), row.status)) {
        summary = await automaticEvent({
          recipient,
          key: 'att:' + row._id + ':' + row.status + ':' + recipient._id,
          title: 'Attendance update',
          body:
            child!.name +
            ' · ' +
            row.status +
            ' · ' +
            row.date.toISOString().slice(0, 10) +
            ' · ' +
            row.session +
            '. Please review Attendance in the school portal.',
          module: 'attendance',
          recordId: String(row._id),
          channel: row.alertChannel || 'InApp',
          actor: { id: String(actor!._id), role: actor!.role },
          context: { attendanceRecord: String(row._id), attendanceStatus: row.status },
        });
      }
    }
    await Attendance.updateOne(
      { _id: row._id, updatedAt: row.updatedAt },
      { $set: { alertProcessedAt: new Date(), alertSummary: summary } },
      { timestamps: false },
    );
  }
}
