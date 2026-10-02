import { Schema, model, Document, Types } from 'mongoose';

export interface ILeaveRequest extends Document {
  _id: Types.ObjectId;
  staff: Types.ObjectId;
  fromDate: Date;
  toDate: Date;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Denied';
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
    status: { type: String, enum: ['Pending', 'Approved', 'Denied'], default: 'Pending', index: true },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const LeaveRequest = model<ILeaveRequest>('LeaveRequest', leaveRequestSchema);
