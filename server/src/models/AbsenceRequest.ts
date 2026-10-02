import { Schema, model, Document, Types } from 'mongoose';

export interface IAbsenceRequest extends Document {
  _id: Types.ObjectId;
  student: Types.ObjectId;
  requestedBy: Types.ObjectId;
  decidedBy?: Types.ObjectId;
  fromDate: Date;
  toDate: Date;
  days: number;
  type: 'Medical' | 'Family event' | 'Travel' | 'Religious observance' | 'Other';
  note: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  decisionNote?: string;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const absenceRequestSchema = new Schema<IAbsenceRequest>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    fromDate: { type: Date, required: true, index: true },
    toDate: { type: Date, required: true },
    days: { type: Number, required: true, min: 1, max: 60 },
    type: {
      type: String,
      enum: ['Medical', 'Family event', 'Travel', 'Religious observance', 'Other'],
      required: true,
    },
    note: { type: String, required: true, trim: true, maxlength: 400 },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    decisionNote: { type: String, trim: true, maxlength: 300 },
    decidedAt: Date,
  },
  { timestamps: true },
);

absenceRequestSchema.index({ student: 1, status: 1, fromDate: -1 });

export const AbsenceRequest = model<IAbsenceRequest>('AbsenceRequest', absenceRequestSchema);
