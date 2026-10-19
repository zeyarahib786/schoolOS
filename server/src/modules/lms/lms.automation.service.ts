import { Assignment } from '../../models/Assignment';
import { User } from '../../models/User';
import { InboxNotification } from '../../models/InboxNotification';
import { requireTeaching } from './lms.teaching.service';
import { assignmentAudience } from './lms.audience';
import { notificationStatus } from '../notifications/notifications.config';
import { queueNotification } from '../notifications/notifications.service';
import { AuthenticatedUser } from '../../middleware/auth';
import { Types } from 'mongoose';
import { ApiError } from '../../utils/ApiError';
async function saveInbox(
  filter: Record<string, unknown>,
  update: Record<string, unknown>,
  options: { upsert: boolean },
) {
  try {
    await InboxNotification.updateOne(filter, update, options);
  } catch (e) {
    if ((e as { code?: number }).code !== 11000) throw e;
  }
}
async function publisher(id: string | undefined) {
  const u = id
    ? await User.findOne({ _id: id, isActive: true, role: { $in: ['Teacher', 'Administrator', 'Principal'] } })
    : null;
  if (!u) throw ApiError.forbidden('Publisher account is unavailable');
  return { id: String(u._id), role: u.role } as AuthenticatedUser;
}
export async function runLmsAutomation(now = new Date()) {
  const scheduled = await Assignment.find({ status: 'Scheduled', publishAt: { $lte: now } })
    .sort({ publishAt: 1 })
    .limit(100);
  for (const row of scheduled) {
    try {
      const actor = await publisher(String(row.publisher || row.createdBy));
      await requireTeaching(actor, row.grade, row.subject, row.academicYear);
      if (row.dueDate <= now) throw ApiError.conflict('Scheduled publication missed its deadline; review assignment');
      await Assignment.updateOne(
        { _id: row._id, status: 'Scheduled', updatedAt: row.updatedAt, __v: row.__v },
        {
          $set: {
            status: 'Published',
            publicationEvent: String(new Types.ObjectId()),
            publicationNotifiedAt: null,
            automationSummary: '',
          },
          $unset: { publishAt: 1 },
          $inc: { __v: 1 },
        },
      );
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      await Assignment.updateOne(
        { _id: row._id, status: 'Scheduled', updatedAt: row.updatedAt },
        { $set: { status: 'Draft', automationSummary: e.message }, $unset: { publishAt: 1 }, $inc: { __v: 1 } },
      );
      await saveInbox(
        {
          recipient: row.publisher || row.createdBy,
          eventKey: 'lms:schedule-error:' + row._id + ':' + row.updatedAt.toISOString(),
        },
        { $setOnInsert: { title: 'Assignment needs review', body: row.title, module: 'lms', recordId: row._id } },
        { upsert: true },
      );
    }
  }
  const pending = await Assignment.find({
    status: 'Published',
    publicationEvent: { $type: 'string' },
    publicationNotifiedAt: null,
  })
    .sort({ updatedAt: 1 })
    .limit(100);
  for (const row of pending) {
    let actor: AuthenticatedUser;
    try {
      actor = await publisher(String(row.publisher || row.createdBy));
      await requireTeaching(actor, row.grade, row.subject, row.academicYear);
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      await Assignment.updateOne(
        { _id: row._id, publicationEvent: row.publicationEvent },
        {
          $set: {
            publicationNotifiedAt: now,
            automationSummary: 'Notifications stopped: publisher permission changed',
          },
        },
      );
      continue;
    }
    const audience = await assignmentAudience(String(row._id));
    let queued = 0;
    for (const recipient of audience) {
      // Recheck publication before each event. Delivery workers also recheck assignment membership.
      if (!(await Assignment.exists({ _id: row._id, status: 'Published', publicationEvent: row.publicationEvent })))
        break;
      const key = 'lms:published:' + row._id + ':' + row.publicationEvent;
      await saveInbox(
        { recipient: recipient._id, eventKey: key },
        {
          $setOnInsert: {
            title: 'New assignment published',
            body: row.title + ' · ' + row.grade,
            module: 'lms',
            recordId: row._id,
          },
        },
        { upsert: true },
      );
      if (row.notifyEmail && notificationStatus().email.configured) {
        await queueNotification(
          {
            recipientEmail: recipient.email,
            channel: 'Email',
            subject: ('New assignment: ' + row.title).slice(0, 160),
            body:
              row.title +
              '\nClass: ' +
              row.grade +
              '\nSubject: ' +
              row.subject +
              '\nDeadline: ' +
              row.dueDate.toISOString() +
              '\nPlease open Learning (LMS) in your school portal for instructions.',
            idempotencyKey: key + ':' + recipient._id,
          },
          actor,
          { lmsAssignment: String(row._id) },
        );
        queued++;
      }
    }
    await Assignment.updateOne(
      { _id: row._id, publicationEvent: row.publicationEvent, status: 'Published' },
      {
        $set: {
          publicationNotifiedAt: now,
          automationSummary:
            audience.length +
            ' in-app notifications; ' +
            queued +
            ' email requests' +
            (actor.role === 'Teacher' ? ' (office approval required)' : '') +
            (row.notifyEmail && !notificationStatus().email.configured ? '; email unconfigured' : ''),
        },
      },
    );
  }
}
