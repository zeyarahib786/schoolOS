import { Schema, model, Document, Types } from 'mongoose';
import { Role } from '../types/roles';

export interface IStaffAttendance extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
  role: Role;
  date: Date;
  status: 'Present' | 'Remote' | 'Late';
  markedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const staffAttendanceSchema = new Schema<IStaffAttendance>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: {
      type: String,
      enum: ['Administrator', 'Principal', 'Teacher', 'Accountant', 'Parent', 'Student'],
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    status: { type: String, enum: ['Present', 'Remote', 'Late'], required: true },
    markedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

staffAttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

export const StaffAttendance = model<IStaffAttendance>('StaffAttendance', staffAttendanceSchema);
