import { Schema, model, Document, Types } from 'mongoose';

export interface IVehicle extends Document {
  _id: Types.ObjectId;
  regNumber: string;
  capacity: number;
  driverName: string;
  driverPhone: string;
  status: 'Available' | 'Maintenance';
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new Schema<IVehicle>(
  {
    regNumber: { type: String, required: true, unique: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    driverName: { type: String, required: true, trim: true, maxlength: 120 },
    driverPhone: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Available', 'Maintenance'], default: 'Available', index: true },
  },
  { timestamps: true },
);

export const Vehicle = model<IVehicle>('Vehicle', vehicleSchema);
