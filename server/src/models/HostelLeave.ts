import { Schema, model, Document, Types } from 'mongoose';

export type HostelLeaveStatus = 'Requested' | 'Approved' | 'Out' | 'Returned' | 'Rejected';

export interface IHostelLeave extends Document {
  student: Types.ObjectId;
  room: Types.ObjectId;
  type: string;
  fromDate: Date;
  toDate: Date;
  reason: string;
  status: HostelLeaveStatus;
  approvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const hostelLeaveSchema = new Schema<IHostelLeave>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    room: { type: Schema.Types.ObjectId, ref: 'HostelRoom', required: true, index: true },
    type: { type: String, required: true, trim: true, maxlength: 60 },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ['Requested', 'Approved', 'Out', 'Returned', 'Rejected'], default: 'Requested', index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const HostelLeave = model<IHostelLeave>('HostelLeave', hostelLeaveSchema);
