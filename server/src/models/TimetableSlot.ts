import { Schema, model, Document, Types } from 'mongoose';

export interface ITimetableSlot extends Document {
  _id: Types.ObjectId;
  grade: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  periodNumber: number;
  subject: string;
  teacherName: string;
  room?: string;
  isSubstitute: boolean;
  status: 'Draft' | 'Published';
  createdAt: Date;
  updatedAt: Date;
}

const timetableSlotSchema = new Schema<ITimetableSlot>(
  {
    grade: { type: String, required: true, trim: true, index: true },
    dayOfWeek: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], required: true },
    periodNumber: { type: Number, required: true, min: 1, max: 8 },
    subject: { type: String, required: true, trim: true, maxlength: 80 },
    teacherName: { type: String, required: true, trim: true, maxlength: 120 },
    room: { type: String, trim: true, maxlength: 80 },
    isSubstitute: { type: Boolean, default: false },
    status: { type: String, enum: ['Draft', 'Published'], default: 'Draft', index: true },
  },
  { timestamps: true },
);

// A grade can't have two subjects scheduled in the same period on the same day - DB-enforced,
// the same compound-uniqueness technique as Attendance's (student, date) and LMS's
// (assignment, student), applied to a scheduling domain. A clash surfaces as a real 409 via the
// standard 11000 catch, not a silent overwrite of whichever subject was there first.
timetableSlotSchema.index({ grade: 1, dayOfWeek: 1, periodNumber: 1 }, { unique: true });
timetableSlotSchema.index({ teacherName: 1, dayOfWeek: 1, periodNumber: 1 }, { unique: true });
timetableSlotSchema.index({ room: 1, dayOfWeek: 1, periodNumber: 1 }, { unique: true, sparse: true });

export const TimetableSlot = model<ITimetableSlot>('TimetableSlot', timetableSlotSchema);
