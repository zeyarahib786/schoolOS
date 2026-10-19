import { Schema, model, Document, Types } from 'mongoose';

export interface ILeaveRequest extends Document {
  _id: Types.ObjectId;
  staff: Types.ObjectId;
  fromDate: Date;
  toDate: Date;
  days: number;
  reason: string;
  type: 'Annual leave' | 'Sick leave' | 'Casual leave' | 'Unpaid leave';
  status: 'Pending' | 'Approved' | 'Denied' | 'Cancelled';
  decidedAt?: Date;
  decisionNote?: string;
  history: Array<{ at: Date; actor: Types.ObjectId; from: string; to: string; reason: string }>;
  decidedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const leaveRequestSchema = new Schema<ILeaveRequest>(
  {
    staff: { type: Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    // Stored at request time (like Payroll's netPay): the day count is part of the historical
    // record of what was requested and approved, not a live derivation - if the counting rule
    // ever changes, already-approved leaves must not silently change size.
    days: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ['Pending', 'Approved', 'Denied', 'Cancelled'], default: 'Pending', index: true },
    type: {
      type: String,
      enum: ['Annual leave', 'Sick leave', 'Casual leave', 'Unpaid leave'],
      default: 'Annual leave',
    },
    decidedAt: Date,
    decisionNote: { type: String, maxlength: 500 },
    history: [
      {
        _id: false,
        at: Date,
        actor: { type: Schema.Types.ObjectId, ref: 'User' },
        from: String,
        to: String,
        reason: { type: String, maxlength: 500 },
      },
    ],
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const LeaveRequest = model<ILeaveRequest>('LeaveRequest', leaveRequestSchema);
