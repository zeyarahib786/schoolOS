import { Schema, model, Document, Types } from 'mongoose';

/** Private correspondence between two users. Access is BIDIRECTIONAL ownership - a user sees a
 * message iff they are its sender OR its recipient ($or scope) - and, uniquely in this codebase,
 * there is NO administrative override: not even an Administrator can read correspondence they
 * are not a party to. Every prior module gave some staff role full read; private messages are
 * the one place that would be wrong. */
export interface IMessage extends Document {
  _id: Types.ObjectId;
  sender: Types.ObjectId;
  recipient: Types.ObjectId;
  subject: string;
  body: string;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Message = model<IMessage>('Message', messageSchema);
