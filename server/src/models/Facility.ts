import { Schema, model, Document, Types } from 'mongoose';

export interface IFacility extends Document {
  _id: Types.ObjectId;
  name: string;
  type: string;
  capacity: number;
  bookingRevision: number;
  status: 'Available' | 'Maintenance';
  history: {
    at: Date;
    by: Types.ObjectId;
    reason: string;
    previous: { name: string; type: string; capacity: number; status: string };
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const facilitySchema = new Schema<IFacility>(
  {
    status: { type: String, enum: ['Available', 'Maintenance'], default: 'Available' },
    history: [
      {
        at: Date,
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        previous: {
          name: { type: String },
          type: { type: String },
          capacity: { type: Number },
          status: { type: String },
        },
      },
    ],
    name: { type: String, required: true, trim: true, unique: true },
    type: { type: String, required: true, trim: true, index: true },
    capacity: { type: Number, required: true, min: 1 },
    // Internal concurrency guard used by booking transactions; excluded from API reads.
    bookingRevision: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

export const Facility = model<IFacility>('Facility', facilitySchema);
