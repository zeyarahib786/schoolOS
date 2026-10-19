import { Schema, model, Document, Types } from 'mongoose';

export interface IBiometricDevice extends Document {
  _id: Types.ObjectId;
  name: string;
  location: string;
  status: 'Unknown' | 'Online' | 'Offline';
  mode: 'Face' | 'Fingerprint' | 'Card' | 'Face + Card' | 'Unspecified';
  manufacturer?: string;
  serialNumber?: string;
  enabled: boolean;
  observedAt?: Date;
  history: {
    at: Date;
    by: Types.ObjectId;
    reason: string;
    previous: { name: string; location: string; status: string; enabled?: boolean };
  }[];
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const biometricDeviceSchema = new Schema<IBiometricDevice>(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 120 },
    location: { type: String, required: true, trim: true, maxlength: 160 },
    status: { type: String, enum: ['Unknown', 'Online', 'Offline'], default: 'Unknown', index: true },
    mode: { type: String, enum: ['Face', 'Fingerprint', 'Card', 'Face + Card', 'Unspecified'], default: 'Unspecified' },
    manufacturer: { type: String, trim: true, maxlength: 160 },
    serialNumber: { type: String, trim: true, maxlength: 160 },
    enabled: { type: Boolean, default: true },
    observedAt: Date,
    history: [
      {
        at: Date,
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        previous: { name: String, location: String, status: String, enabled: Boolean },
      },
    ],
    lastSyncAt: { type: Date },
  },
  { timestamps: true },
);

export const BiometricDevice = model<IBiometricDevice>('BiometricDevice', biometricDeviceSchema);
