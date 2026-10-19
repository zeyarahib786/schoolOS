import { Schema, model, Document, Types } from 'mongoose';

/** Unlike Attendance's (student, date, session) or Certificates' (type, year) - both exact-match
 * keys a simple compound unique index can enforce - preventing a double-booking here means
 * checking whether a requested [startTime, endTime) range OVERLAPS any existing booking for the
 * same facility and date. A unique index cannot express "no overlapping range" the way it can
 * express "no duplicate key" - see facilities.repository.ts for how this is actually made safe
 * under concurrency (a MongoDB transaction, not a unique index). */
export interface IBooking extends Document {
  _id: Types.ObjectId;
  facility: Types.ObjectId;
  date: Date;
  startTime: string; // "HH:MM", 24h
  endTime: string;
  bookedBy: Types.ObjectId;
  purpose: string;
  status: 'Active' | 'Cancelled';
  cancelledAt?: Date;
  history: { at: Date; by: Types.ObjectId; reason: string; action: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    facility: { type: Schema.Types.ObjectId, ref: 'Facility', required: true, index: true },
    date: { type: Date, required: true, index: true },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    bookedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['Active', 'Cancelled'], default: 'Active' },
    cancelledAt: Date,
    history: [{ at: Date, by: { type: Schema.Types.ObjectId, ref: 'User' }, reason: String, action: String }],
    purpose: { type: String, required: true, trim: true, maxlength: 300 },
  },
  { timestamps: true },
);

bookingSchema.index({ facility: 1, date: 1 });

export const Booking = model<IBooking>('Booking', bookingSchema);
