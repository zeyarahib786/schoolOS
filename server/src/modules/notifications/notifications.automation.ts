import { NotificationDelivery } from '../../models/NotificationDelivery';
import { InboxNotification } from '../../models/InboxNotification';
import { AuthenticatedUser } from '../../middleware/auth';
import { notificationStatus } from './notifications.config';
import { queueNotification } from './notifications.service';
import { ApiError } from '../../utils/ApiError';
export async function automaticEvent(input: {
  recipient: { _id: unknown; email: string };
  key: string;
  title: string;
  body: string;
  module: 'lms' | 'attendance';
  recordId: string;
  channel: 'InApp' | 'Email' | 'SMS';
  actor: AuthenticatedUser;
  context: Parameters<typeof queueNotification>[2];
}) {
  try {
    await InboxNotification.updateOne(
      { recipient: input.recipient._id, eventKey: input.key },
      { $setOnInsert: { title: input.title, body: input.body, module: input.module, recordId: input.recordId } },
      { upsert: true },
    );
  } catch (e) {
    if ((e as { code?: number }).code !== 11000) throw e;
  }
  if (input.channel === 'InApp') return 'In-app saved';
  const event = input.key + ':' + input.channel;
  if (await NotificationDelivery.exists({ requestKey: 'auto:' + event })) return 'External request already recorded';
  const configured = notificationStatus();
  if (!(input.channel === 'Email' ? configured.email.configured : configured.sms.configured))
    return 'External channel unconfigured; in-app saved';
  try {
    await queueNotification(
      {
        recipientEmail: input.recipient.email,
        channel: input.channel,
        subject: input.title.slice(0, 160),
        body: input.body,
        idempotencyKey: input.key,
      },
      input.actor,
      { ...input.context, automationEvent: input.key + ':' + input.channel },
    );
    return input.actor.role === 'Teacher' ? 'External request awaiting office approval' : 'External request queued';
  } catch (e) {
    if (
      e instanceof ApiError &&
      e.statusCode === 409 &&
      (await NotificationDelivery.exists({ requestKey: 'auto:' + event }))
    )
      return 'External request already recorded';
    if (e instanceof ApiError && [400, 404].includes(e.statusCode))
      return 'External recipient unavailable; in-app saved';
    throw e;
  }
}
