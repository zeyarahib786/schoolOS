import { Schema, model, Document, Types } from 'mongoose';

/** Reuses the Booking model and its transaction-safe overlap prevention
 * (facilities.repository.ts), keeping Events and Facilities on the same booking ledger.
 * `booking` is optional: an event with no
 * venue (e.g. a virtual assembly, or an announcement-only entry) simply has no linked booking
 * and therefore no double-booking concern at all. */
export interface IEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  date: Date;
  audience: 'All' | 'Students' | 'Staff' | 'Parents';
  booking?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    date: { type: Date, required: true, index: true },
    audience: { type: String, enum: ['All', 'Students', 'Staff', 'Parents'], default: 'All' },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const Event = model<IEvent>('Event', eventSchema);
