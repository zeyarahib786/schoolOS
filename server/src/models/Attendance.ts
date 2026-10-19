import { Schema, model, Document, Types } from 'mongoose';

/** One record per student, date, and session. The compound unique index prevents a student from
 * being marked twice for the same session. */
export interface IAttendance extends Document {
  _id: Types.ObjectId;
  student: Types.ObjectId;
  date: Date;
  session: 'AM' | 'PM';
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  markedBy: Types.ObjectId;
  notes?: string;
  alertRequestedAt?: Date;
  alertProcessedAt?: Date;
  alertChannel?: 'InApp' | 'Email' | 'SMS';
  alertSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    date: { type: Date, required: true, index: true },
    session: { type: String, enum: ['AM', 'PM'], required: true },
    status: { type: String, enum: ['Present', 'Absent', 'Late', 'Excused'], required: true },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    alertSummary: String,
    alertRequestedAt: Date,
    alertProcessedAt: Date,
    alertChannel: { type: String, enum: ['InApp', 'Email', 'SMS'] },
    notes: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true },
);

// The actual duplicate-prevention constraint - enforced by MongoDB itself, not application logic
// that could race under concurrent requests.
attendanceSchema.index({ student: 1, date: 1, session: 1 }, { unique: true });

export const Attendance = model<IAttendance>('Attendance', attendanceSchema);
