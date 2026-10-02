import { Schema, model, Document, Types } from 'mongoose';

/** A bookable parent-teacher meeting slot. `status` is the availability flag: Available
 * means the slot may be claimed. Booking uses an atomic findOneAndUpdate whose filter includes
 * `status: 'Available'`, so two parents racing for the same slot cannot both succeed.
 */
export interface IMeetingSlot extends Document {
  _id: Types.ObjectId;
  teacher: Types.ObjectId;
  date: Date;
  startTime: string;
  bookedBy?: Types.ObjectId | null;
  bookedForStudent?: Types.ObjectId | null;
  bookedGuardian?: Types.ObjectId | null;
  status: 'Available' | 'Pending' | 'Confirmed';
  room: string;
  link?: string | null;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const meetingSlotSchema = new Schema<IMeetingSlot>(
  {
    teacher: { type: Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    date: { type: Date, required: true, index: true },
    startTime: {
      type: String,
      required: true,
      trim: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'startTime must be HH:MM'],
    },
    bookedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    bookedForStudent: { type: Schema.Types.ObjectId, ref: 'Student', default: null },
    bookedGuardian: { type: Schema.Types.ObjectId, ref: 'Guardian', default: null },
    status: { type: String, enum: ['Available', 'Pending', 'Confirmed'], default: 'Available', index: true },
    room: { type: String, trim: true, maxlength: 80, default: 'TBC' },
    link: { type: String, trim: true, maxlength: 500, default: null },
    note: { type: String, trim: true, maxlength: 600 },
  },
  { timestamps: true },
);

// The same teacher can't publish two slots at the same date+time - compound uniqueness again
// (Attendance/LMS/Timetable's technique), here preventing double-publication rather than clash.
meetingSlotSchema.index({ teacher: 1, date: 1, startTime: 1 }, { unique: true });

export const MeetingSlot = model<IMeetingSlot>('MeetingSlot', meetingSlotSchema);
