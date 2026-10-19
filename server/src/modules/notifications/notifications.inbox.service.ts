import { Types } from 'mongoose';
import { InboxNotification } from '../../models/InboxNotification';
import { CrmLead, ICrmLead } from '../../models/CrmLead';
import { User } from '../../models/User';
export async function notifyCrm(lead: ICrmLead, kind: string, key: string) {
  let recipients = await User.find({
    isActive: true,
    role: { $in: ['Administrator', 'Principal'] },
    ...(lead.ownerUserId ? { _id: lead.ownerUserId } : {}),
  })
    .select('_id')
    .lean<{ _id: Types.ObjectId }[]>();
  if (!recipients.length && lead.ownerUserId)
    recipients = await User.find({ isActive: true, role: { $in: ['Administrator', 'Principal'] } })
      .select('_id')
      .lean<{ _id: Types.ObjectId }[]>();
  if (!recipients.length) return 0;
  await InboxNotification.bulkWrite(
    recipients.map((user) => ({
      updateOne: {
        filter: { recipient: user._id, eventKey: key },
        update: { $setOnInsert: { title: kind, body: lead.name, module: 'crm', recordId: lead._id } },
        upsert: true,
      },
    })),
  );
  return recipients.length;
}
export async function notifyDueFollowUps(now = new Date()) {
  const leads = await CrmLead.find({
    archived: false,
    stage: { $ne: 'Won' },
    followUpDate: { $lte: now },
    $or: [{ followUpNotifiedFor: { $exists: false } }, { $expr: { $ne: ['$followUpNotifiedFor', '$followUpDate'] } }],
  }).limit(500);
  for (const lead of leads) {
    const count = await notifyCrm(
      lead,
      'CRM follow-up due',
      'crm:due:' + lead._id + ':' + lead.followUpDate!.toISOString(),
    );
    if (!count) continue;
    await CrmLead.updateOne(
      { _id: lead._id, followUpDate: lead.followUpDate },
      { $set: { followUpNotifiedFor: lead.followUpDate } },
    );
  }
}
