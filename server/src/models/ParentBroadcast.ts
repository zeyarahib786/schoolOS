import { Document, model, Schema, Types } from 'mongoose';

export interface IParentBroadcast extends Document {
  _id: Types.ObjectId;
  subject: string;
  message: string;
  audience: 'All parents' | 'By grade' | 'Single class' | 'Individual guardian';
  audienceLabel: string;
  grade?: string;
  className?: string;
  guardianId?: Types.ObjectId;
  channel: 'In-app + Email' | 'SMS + Email' | 'In-app only';
  recipientCount: number;
  deliveredCount: number;
  readCount: number;
  sentBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const parentBroadcastSchema = new Schema<IParentBroadcast>(
  {
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 600 },
    audience: { type: String, enum: ['All parents', 'By grade', 'Single class', 'Individual guardian'], required: true },
    audienceLabel: { type: String, required: true, trim: true, maxlength: 240 },
    grade: { type: String, trim: true, maxlength: 60 },
    className: { type: String, trim: true, maxlength: 60 },
    guardianId: { type: Schema.Types.ObjectId, ref: 'Guardian' },
    channel: { type: String, enum: ['In-app + Email', 'SMS + Email', 'In-app only'], required: true },
    recipientCount: { type: Number, required: true, min: 1 },
    deliveredCount: { type: Number, required: true, min: 0 },
    readCount: { type: Number, required: true, min: 0, default: 0 },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const ParentBroadcast = model<IParentBroadcast>('ParentBroadcast', parentBroadcastSchema);
