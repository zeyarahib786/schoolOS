import { createHash } from 'crypto';
import { CrmLead } from '../../models/CrmLead';
import { CrmEmailBatch } from '../../models/CrmEmailBatch';
import { NotificationDelivery } from '../../models/NotificationDelivery';
import { AuthenticatedUser } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { notificationStatus } from '../notifications/notifications.config';
import { queueCrmEmail } from '../notifications/notifications.service';
import { bulkCrmEmailSchema } from './crm.validation';
import { z } from 'zod';

export async function queueBulkEmail(input: z.infer<typeof bulkCrmEmailSchema>['body'], user: AuthenticatedUser) {
  if (!notificationStatus().email.configured)
    throw new ApiError(503, 'DELIVERY_UNCONFIGURED', 'Configure Resend before sending email');
  const recipients = input.recipients
    .map((r) => ({ id: r.id, email: r.email.toLowerCase() }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const requestKey = user.id + ':' + input.idempotencyKey;
  const fingerprint = createHash('sha256')
    .update(JSON.stringify([recipients, input.subject, input.body]))
    .digest('hex');
  let batch;
  try {
    batch = await CrmEmailBatch.findOneAndUpdate(
      { requestKey },
      { $setOnInsert: { fingerprint, sender: user.id } },
      { upsert: true, new: true },
    );
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    batch = await CrmEmailBatch.findOne({ requestKey });
  }
  if (!batch || batch.fingerprint !== fingerprint)
    throw ApiError.conflict('Batch key already used for different recipients or content');
  const results: Array<{ id: string; email: string; status: string; deliveryId?: string; reason?: string }> = [];
  const seen = new Set<string>();
  for (const recipient of recipients) {
    if (seen.has(recipient.email)) {
      results.push({ ...recipient, status: 'Skipped', reason: 'Duplicate email address' });
      continue;
    }
    const key = 'bulk-' + batch._id + '-' + recipient.id;
    // A replay returns the existing delivery, even when the contact changed after the first request.
    const existing = await NotificationDelivery.findOne({ requestKey: user.id + ':crm:' + key });
    if (existing) {
      seen.add(recipient.email);
      results.push({ ...recipient, status: existing.status, deliveryId: String(existing._id) });
      continue;
    }
    const lead = await CrmLead.findOne({ _id: recipient.id, archived: false, stage: { $ne: 'Won' } });
    if (!lead || lead.guardianEmail?.toLowerCase() !== recipient.email) {
      results.push({
        ...recipient,
        status: 'Skipped',
        reason: 'Enquiry unavailable or email changed; review contacts again',
      });
      continue;
    }
    const row = await queueCrmEmail(
      recipient.id,
      { ...input, idempotencyKey: key, expectedEmail: recipient.email },
      user,
    );
    seen.add(recipient.email);
    results.push({ ...recipient, status: row.status, deliveryId: String(row._id) });
  }
  return { batchId: String(batch._id), results };
}

export async function leadDeliveries(id: string) {
  if (!(await CrmLead.exists({ _id: id }))) throw ApiError.notFound('CRM lead not found');
  return NotificationDelivery.find({ crmLead: id })
    .sort({ createdAt: -1 })
    .limit(100)
    .select('_id destination subject status errorCode createdAt updatedAt');
}
