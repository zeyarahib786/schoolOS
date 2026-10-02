import { Schema, model, Document, Types } from 'mongoose';

export interface IBiometricDevice extends Document {
  _id: Types.ObjectId;
  name: string;
  location: string;
  status: 'Online' | 'Offline';
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const biometricDeviceSchema = new Schema<IBiometricDevice>(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 120 },
    location: { type: String, required: true, trim: true, maxlength: 160 },
    status: { type: String, enum: ['Online', 'Offline'], default: 'Offline', index: true },
    lastSyncAt: { type: Date },
  },
  { timestamps: true },
);

export const BiometricDevice = model<IBiometricDevice>('BiometricDevice', biometricDeviceSchema);
