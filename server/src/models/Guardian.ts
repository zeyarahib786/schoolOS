import { Document, model, Schema, Types } from 'mongoose';

export const GUARDIAN_PORTAL_STATUSES = ['Active', 'Invited', 'Suspended'] as const;

export interface IGuardian extends Document {
  _id: Types.ObjectId;
  refId: string;
  name: string;
  relation: 'Parent' | 'Father' | 'Mother' | 'Guardian' | 'Other';
  phone: string;
  email: string;
  studentIds: Types.ObjectId[];
  portalStatus: (typeof GUARDIAN_PORTAL_STATUSES)[number];
  lastLoginAt?: Date | null;
  pickupAuthorized: boolean;
  financialResponsible: boolean;
  custody: string;
  consents: { media: boolean; trips: boolean; medical: boolean };
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const guardianSchema = new Schema<IGuardian>(
  {
    refId: { type: String, required: true, unique: true, trim: true, maxlength: 30 },
    name: { type: String, required: true, trim: true, maxlength: 120, index: true },
    relation: { type: String, enum: ['Parent', 'Father', 'Mother', 'Guardian', 'Other'], default: 'Parent' },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    studentIds: [{ type: Schema.Types.ObjectId, ref: 'Student', required: true }],
    portalStatus: { type: String, enum: GUARDIAN_PORTAL_STATUSES, default: 'Invited', index: true },
    lastLoginAt: { type: Date, default: null },
    pickupAuthorized: { type: Boolean, default: true },
    financialResponsible: { type: Boolean, default: true },
    custody: { type: String, default: 'Full', trim: true, maxlength: 300 },
    consents: {
      media: { type: Boolean, default: false },
      trips: { type: Boolean, default: false },
      medical: { type: Boolean, default: false },
    },
    note: { type: String, trim: true, maxlength: 600 },
  },
  { timestamps: true },
);

guardianSchema.index({ studentIds: 1 });
export const Guardian = model<IGuardian>('Guardian', guardianSchema);
