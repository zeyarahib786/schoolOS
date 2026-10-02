import { Document, model, Schema, Types } from 'mongoose';

export interface IGuardianMessage extends Document {
  _id: Types.ObjectId;
  guardianId: Types.ObjectId;
  direction: 'out' | 'in';
  from: string;
  text: string;
  broadcastId?: Types.ObjectId;
  sentBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const guardianMessageSchema = new Schema<IGuardianMessage>(
  {
    guardianId: { type: Schema.Types.ObjectId, ref: 'Guardian', required: true, index: true },
    direction: { type: String, enum: ['out', 'in'], required: true },
    from: { type: String, required: true, trim: true, maxlength: 120 },
    text: { type: String, required: true, trim: true, maxlength: 600 },
    broadcastId: { type: Schema.Types.ObjectId, ref: 'ParentBroadcast' },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

guardianMessageSchema.index({ guardianId: 1, createdAt: 1 });
export const GuardianMessage = model<IGuardianMessage>('GuardianMessage', guardianMessageSchema);
