import { Schema, model, Types } from 'mongoose';
const schema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventKey: { type: String, required: true },
    title: { type: String, required: true, maxlength: 160 },
    body: { type: String, required: true, maxlength: 1000 },
    module: { type: String, enum: ['crm', 'communication', 'lms', 'attendance'], required: true },
    recordId: { type: Schema.Types.ObjectId, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);
schema.index({ recipient: 1, eventKey: 1 }, { unique: true });
schema.index({ recipient: 1, createdAt: -1 });
export const InboxNotification = model('InboxNotification', schema);
export type InboxRecipient = string | Types.ObjectId;
