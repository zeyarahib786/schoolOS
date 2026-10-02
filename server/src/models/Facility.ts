import { Schema, model, Document, Types } from 'mongoose';

export interface IFacility extends Document {
  _id: Types.ObjectId;
  name: string;
  type: string;
  capacity: number;
  bookingRevision: number;
  createdAt: Date;
  updatedAt: Date;
}

const facilitySchema = new Schema<IFacility>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    type: { type: String, required: true, trim: true, index: true },
    capacity: { type: Number, required: true, min: 1 },
    // Internal concurrency guard used by booking transactions; excluded from API reads.
    bookingRevision: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

export const Facility = model<IFacility>('Facility', facilitySchema);
