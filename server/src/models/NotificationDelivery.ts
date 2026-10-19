import { Document, model, Schema, Types } from 'mongoose';
export const DELIVERY_STATES = [
  'Awaiting approval',
  'Pending',
  'Sending',
  'Accepted',
  'Delivered',
  'Failed',
  'Unknown',
  'Cancelled',
  'Bounced',
  'Complained',
] as const;
export interface INotificationDelivery extends Document {
  _id: Types.ObjectId;
  sender: Types.ObjectId;
  recipient?: Types.ObjectId;
  crmLead?: Types.ObjectId;
  teacherAiDraft?: Types.ObjectId;
  lmsAssignment?: Types.ObjectId;
  lmsReminder?: boolean;
  lmsReminderDue?: Date;
  lmsReminderStage?: 'before' | 'overdue';
  attendanceRecord?: Types.ObjectId;
  attendanceStatus?: string;
  channel: 'Email' | 'SMS';
  destination: string;
  fromIdentity: string;
  subject: string;
  body: string;
  requestKey: string;
  fingerprint: string;
  status: (typeof DELIVERY_STATES)[number];
  attempts: number;
  attemptedAt?: Date;
  firstAttemptAt?: Date;
  providerId?: string;
  errorCode?: string;
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<INotificationDelivery>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: function () {
        return !this.crmLead;
      },
    },
    lmsReminderStage: { type: String, enum: ['before', 'overdue'] },
    lmsReminderDue: Date,
    lmsReminder: { type: Boolean, default: false },
    attendanceRecord: { type: Schema.Types.ObjectId, ref: 'Attendance' },
    attendanceStatus: String,
    teacherAiDraft: { type: Schema.Types.ObjectId, ref: 'TeacherAiDraft' },
    lmsAssignment: { type: Schema.Types.ObjectId, ref: 'Assignment' },
    crmLead: { type: Schema.Types.ObjectId, ref: 'CrmLead' },
    channel: { type: String, enum: ['Email', 'SMS'], required: true },
    destination: { type: String, required: true },
    fromIdentity: { type: String, required: true },
    subject: { type: String, required: true, maxlength: 160 },
    body: { type: String, required: true, maxlength: 5000 },
    requestKey: { type: String, required: true, unique: true },
    fingerprint: { type: String, required: true },
    status: { type: String, enum: DELIVERY_STATES, default: 'Pending', index: true },
    attempts: { type: Number, default: 0 },
    attemptedAt: Date,
    firstAttemptAt: Date,
    providerId: { type: String, index: true },
    errorCode: String,
  },
  { timestamps: true },
);
schema.index({ status: 1, createdAt: 1 });
schema.index({ crmLead: 1, createdAt: -1 });
export const NotificationDelivery = model<INotificationDelivery>('NotificationDelivery', schema);
const eventSchema = new Schema(
  {
    eventId: { type: String, unique: true, required: true },
    providerId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    occurredAt: { type: Date, required: true },
  },
  { timestamps: true },
);
export const NotificationEvent = model('NotificationEvent', eventSchema);
