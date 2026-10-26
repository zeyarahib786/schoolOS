import { ClientSession } from 'mongoose';
import { teacherAiRecipientValid } from '../lms/lms.ai.audience';
import { attendanceAlertAudience } from '../attendance/attendance.audience';
import { assignmentAudience } from '../lms/lms.audience';
import { CrmLead } from '../../models/CrmLead';
import { createHash } from 'crypto';
import { Webhook } from 'svix';
import { User } from '../../models/User';
import { Staff } from '../../models/Staff';
import { Guardian } from '../../models/Guardian';
import { NotificationDelivery, NotificationEvent } from '../../models/NotificationDelivery';
import { AuthenticatedUser } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { logAudit } from '../audit/audit.service';
import { notificationConfig, notificationStatus } from './notifications.config';
import { QueueNotificationInput, listNotificationsQuery } from './notifications.validation';
import { ProviderError, sendExternal } from './notifications.provider';
export async function recipientContact(email: string, channel: 'Email' | 'SMS') {
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select('_id email role');
  if (!user || (await Guardian.exists({ userId: user._id, portalStatus: 'Suspended' })))
    throw ApiError.notFound('Active recipient account not found');
  if (channel === 'Email') {
    if (user.email.endsWith('@accounts.schoolos.invalid'))
      throw ApiError.badRequest(
        'This account has no real login email. Use an in-app message or correct the school contact details.',
      );
    return { user, destination: user.email };
  }
  const profile =
    user.role === 'Parent'
      ? await Guardian.findOne({ userId: user._id })
      : await Staff.findOne({ userId: user._id, status: { $ne: 'Inactive' } });
  const phone = profile?.phone?.trim();
  if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone))
    throw ApiError.badRequest('Recipient requires a linked phone in international E.164 format');
  return { user, destination: phone };
}
export async function queueNotification(
  input: QueueNotificationInput,
  user: AuthenticatedUser,
  context?: {
    automationEvent?: string;
    teacherAiDraft?: string;
    lmsAssignment?: string;
    lmsReminder?: boolean;
    lmsReminderDue?: string;
    lmsReminderStage?: 'before' | 'overdue';
    attendanceRecord?: string;
    attendanceStatus?: string;
  },
  session?: ClientSession,
) {
  const config = notificationConfig(),
    status = notificationStatus();
  if (!(input.channel === 'Email' ? status.email.configured : status.sms.configured))
    throw new ApiError(503, 'DELIVERY_UNCONFIGURED', 'Configure this external channel before sending');
  if (input.channel === 'SMS' && input.body.length > 600) throw ApiError.badRequest('SMS is limited to 600 characters');
  const { user: recipient, destination } = await recipientContact(input.recipientEmail, input.channel);
  const requestKey = context?.automationEvent
      ? 'auto:' + context.automationEvent
      : user.id + ':' + input.idempotencyKey,
    fromIdentity = input.channel === 'Email' ? config.RESEND_FROM_EMAIL! : config.SMS_SENDER_ID || 'SchoolOS';
  const fingerprint = createHash('sha256')
    .update(JSON.stringify([recipient._id, input.channel, destination, fromIdentity, input.subject, input.body]))
    .digest('hex');
  let row = await NotificationDelivery.findOne({ requestKey }).session(session || null);
  if (!row) {
    try {
      [row] = await NotificationDelivery.create(
        [
          {
            sender: user.id,
            ...(context || {}),
            recipient: recipient._id,
            channel: input.channel,
            destination,
            fromIdentity,
            subject: input.subject,
            body: input.body,
            requestKey,
            fingerprint,
            status: user.role === 'Teacher' ? 'Awaiting approval' : 'Pending',
          },
        ],
        { session },
      );
      await logAudit('Queued ' + input.channel + ' notification ' + row._id, 'Communication', user.id);
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
      row = await NotificationDelivery.findOne({ requestKey });
    }
  }
  if (!row || row.fingerprint !== fingerprint)
    throw ApiError.conflict('Request key was already used with different notification details');
  return row;
}
export async function listDeliveries(query: unknown, user: AuthenticatedUser) {
  const q = listNotificationsQuery.parse(query);
  const filter = ['Administrator', 'Principal'].includes(user.role) ? {} : { sender: user.id };
  const [items, total] = await Promise.all([
    NotificationDelivery.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('recipient', 'name')
      .select('-requestKey -fingerprint'),
    NotificationDelivery.countDocuments(filter),
  ]);
  return { items, pagination: { ...q, total, totalPages: Math.ceil(total / q.limit) } };
}
function editable(id: string, user: AuthenticatedUser) {
  return { _id: id, ...(['Administrator', 'Principal'].includes(user.role) ? {} : { sender: user.id }) };
}
export async function cancelDelivery(id: string, user: AuthenticatedUser) {
  const row = await NotificationDelivery.findOneAndUpdate(
    { ...editable(id, user), status: { $in: ['Pending', 'Awaiting approval'] } },
    { $set: { status: 'Cancelled' } },
    { new: true },
  );
  if (!row) throw ApiError.conflict('Only a pending owned notification can be cancelled');
  await logAudit('Cancelled external notification ' + id, 'Communication', user.id);
  return row;
}
export async function retryDelivery(id: string, user: AuthenticatedUser) {
  const row = await NotificationDelivery.findOne(editable(id, user));
  if (!row) throw ApiError.notFound('Notification not found');
  if (
    row.status !== 'Failed' &&
    !(
      row.status === 'Unknown' &&
      row.channel === 'Email' &&
      row.firstAttemptAt &&
      Date.now() - row.firstAttemptAt.getTime() < 23 * 3600000
    )
  )
    throw ApiError.conflict('This delivery cannot be safely retried; inspect the provider before sending again');
  if (row.channel === 'Email' && row.firstAttemptAt && Date.now() - row.firstAttemptAt.getTime() >= 23 * 3600000)
    throw ApiError.conflict('Provider idempotency window expired; inspect the provider before sending again');
  const updated = await NotificationDelivery.findOneAndUpdate(
    { ...editable(id, user), status: row.status, updatedAt: row.updatedAt },
    { $set: { status: 'Pending' }, $unset: { errorCode: 1 } },
    { new: true },
  );
  if (!updated) throw ApiError.conflict('Delivery changed; refresh');
  await logAudit('Retried external notification ' + id, 'Communication', user.id);
  return updated;
}
const events = {
  'email.delivered': 'Delivered',
  'email.bounced': 'Bounced',
  'email.complained': 'Complained',
  'email.failed': 'Failed',
} as const;
export async function reconcileDelivery(providerId: string) {
  const received = await NotificationEvent.find({ providerId });
  const states = received.map((e) => events[e.type as keyof typeof events]);
  const terminal = ['Complained', 'Bounced', 'Failed', 'Delivered'].find((s) =>
    states.includes(s as (typeof states)[number]),
  );
  if (terminal)
    await NotificationDelivery.updateOne(
      { providerId, channel: 'Email', status: { $in: ['Accepted', 'Delivered', 'Bounced', 'Complained', 'Failed'] } },
      { $set: { status: terminal } },
    );
}
export async function receiveWebhook(raw: Buffer, headers: Record<string, string>) {
  const secret = notificationConfig().RESEND_WEBHOOK_SECRET;
  if (!secret) throw new ApiError(503, 'WEBHOOK_UNCONFIGURED', 'Webhook verification is not configured');
  let verified: unknown;
  try {
    verified = new Webhook(secret).verify(raw.toString('utf8'), headers);
  } catch {
    throw ApiError.unauthorized('Invalid webhook signature');
  }
  const payload = verified as { type?: string; created_at?: string; data?: { email_id?: string } };
  if (!payload.type || !(payload.type in events)) return;
  if (!payload.data?.email_id || !payload.created_at || Number.isNaN(Date.parse(payload.created_at)))
    throw ApiError.badRequest('Invalid delivery event');
  try {
    await NotificationEvent.updateOne(
      { eventId: headers['svix-id'] },
      {
        $setOnInsert: {
          providerId: payload.data.email_id,
          type: payload.type,
          occurredAt: new Date(payload.created_at),
        },
      },
      { upsert: true },
    );
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  await reconcileDelivery(payload.data.email_id);
}
export async function processOneDelivery() {
  await NotificationDelivery.updateMany(
    { status: 'Sending', attemptedAt: { $lt: new Date(Date.now() - 120000) } },
    { $set: { status: 'Unknown', errorCode: 'WORKER_RESPONSE_UNKNOWN' } },
  );
  const c = notificationConfig();
  if (!c.NOTIFICATIONS_ENABLED) return false;
  const job = await NotificationDelivery.findOneAndUpdate(
    { status: 'Pending' },
    { $set: { status: 'Sending', attemptedAt: new Date() }, $inc: { attempts: 1 } },
    { new: true, sort: { createdAt: 1 } },
  );
  if (!job) return false;
  if (!job.firstAttemptAt) {
    job.firstAttemptAt = job.attemptedAt;
    await job.save();
  }
  try {
    if (job.channel === 'Email' && job.firstAttemptAt && Date.now() - job.firstAttemptAt.getTime() >= 23 * 3600000)
      throw new ProviderError('IDEMPOTENCY_WINDOW_EXPIRED', true);
    if (
      job.lmsAssignment &&
      !(
        await assignmentAudience(String(job.lmsAssignment), job.lmsReminder, job.lmsReminderDue, job.lmsReminderStage)
      ).some((u) => String(u._id) === String(job.recipient))
    )
      throw new ProviderError('ASSIGNMENT_RECIPIENT_CHANGED', false);
    if (
      job.attendanceRecord &&
      !(await attendanceAlertAudience(String(job.attendanceRecord), job.attendanceStatus)).some(
        (u) => String(u._id) === String(job.recipient),
      )
    )
      throw new ProviderError('ATTENDANCE_RECIPIENT_CHANGED', false);
    if (job.teacherAiDraft && !(await teacherAiRecipientValid(String(job.teacherAiDraft), String(job.recipient))))
      throw new ProviderError('TEACHER_AI_RECIPIENT_CHANGED', false);
    if (job.crmLead) {
      const lead = await CrmLead.findById(job.crmLead);
      if (!lead || lead.archived) throw new ProviderError('RECIPIENT_UNAVAILABLE', false);
      if (lead.guardianEmail !== job.destination) throw new ProviderError('RECIPIENT_CONTACT_CHANGED', false);
    } else {
      const account = await User.findById(job.recipient).select('email');
      if (!account) throw new ProviderError('RECIPIENT_UNAVAILABLE', false);
      const contact = await recipientContact(account.email, job.channel);
      if (contact.destination !== job.destination) throw new ProviderError('RECIPIENT_CONTACT_CHANGED', false);
    }
    const providerId = await sendExternal(job);
    await NotificationDelivery.updateOne(
      { _id: job._id, status: 'Sending' },
      { $set: { status: 'Accepted', providerId }, $unset: { errorCode: 1 } },
    );
    if (job.channel === 'Email') await reconcileDelivery(providerId);
  } catch (error) {
    const e =
      error instanceof ProviderError
        ? error
        : error instanceof ApiError
          ? new ProviderError('RECIPIENT_UNAVAILABLE', false)
          : new ProviderError('PROVIDER_RESPONSE_UNKNOWN', true);
    await NotificationDelivery.updateOne(
      { _id: job._id, status: 'Sending' },
      { $set: { status: e.ambiguous ? 'Unknown' : 'Failed', errorCode: e.code } },
    );
  }
  return true;
}

export async function approveDelivery(id: string, user: AuthenticatedUser) {
  const row = await NotificationDelivery.findOneAndUpdate(
    { _id: id, status: 'Awaiting approval' },
    { $set: { status: 'Pending' } },
    { new: true },
  );
  if (!row) throw ApiError.conflict('Only an awaiting notification can be approved');
  await logAudit('Approved external notification ' + id, 'Communication', user.id);
  return row;
}

export async function queueCrmEmail(
  id: string,
  input: { subject: string; body: string; idempotencyKey: string; expectedEmail?: string },
  user: AuthenticatedUser,
) {
  if (!notificationStatus().email.configured)
    throw new ApiError(503, 'DELIVERY_UNCONFIGURED', 'Configure Resend before sending email');
  const lead = await CrmLead.findById(id);
  if (!lead || lead.archived) throw ApiError.notFound('Active CRM lead not found');
  if (!lead.guardianEmail) throw ApiError.badRequest('Add a guardian email before sending');
  if (input.expectedEmail && lead.guardianEmail.toLowerCase() !== input.expectedEmail.toLowerCase())
    throw ApiError.conflict('Guardian email changed since recipient review');
  const key = user.id + ':crm:' + input.idempotencyKey;
  const fingerprint = createHash('sha256')
    .update(JSON.stringify([id, lead.guardianEmail, input.subject, input.body]))
    .digest('hex');
  let row;
  try {
    row = await NotificationDelivery.findOneAndUpdate(
      { requestKey: key },
      {
        $setOnInsert: {
          sender: user.id,
          crmLead: lead._id,
          channel: 'Email',
          destination: lead.guardianEmail,
          fromIdentity: notificationConfig().RESEND_FROM_EMAIL!,
          subject: input.subject,
          body: input.body,
          fingerprint,
          status: 'Pending',
        },
      },
      { upsert: true, new: true },
    );
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    row = await NotificationDelivery.findOne({ requestKey: key });
  }
  if (!row) throw ApiError.conflict('Email queue request could not be resolved');
  if (row.fingerprint !== fingerprint) throw ApiError.conflict('Idempotency key already used for another email');
  await CrmLead.updateOne(
    { _id: id, 'activityLog.action': { $ne: 'Email queued · ' + row._id } },
    {
      $push: {
        activityLog: { $each: [{ action: 'Email queued · ' + row._id, occurredAt: row.createdAt }], $position: 0 },
      },
      $set: { lastActivityAt: new Date() },
    },
  );
  return row;
}
