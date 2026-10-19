import { Schema, model, Document, Types } from 'mongoose';

export type HostelRollStatus = 'Present' | 'Late' | 'On leave' | 'Absent';

export interface IHostelRollCall extends Document {
  student: Types.ObjectId;
  date: string;
  status: HostelRollStatus;
  history: Array<{ at: Date; actor: Types.ObjectId; reason: string; previousStatus?: string; status: string }>;
  markedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const hostelRollCallSchema = new Schema<IHostelRollCall>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    status: { type: String, enum: ['Present', 'Late', 'On leave', 'Absent'], required: true },
    history: [
      {
        _id: false,
        at: Date,
        actor: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        previousStatus: String,
        status: String,
      },
    ],
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

hostelRollCallSchema.index({ student: 1, date: 1 }, { unique: true });
export const HostelRollCall = model<IHostelRollCall>('HostelRollCall', hostelRollCallSchema);
