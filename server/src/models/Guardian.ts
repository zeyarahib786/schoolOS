import { Document, model, Schema, Types } from 'mongoose';

export const GUARDIAN_PORTAL_STATUSES = ['Active', 'Invited', 'Suspended'] as const;

export interface IGuardian extends Document {
  _id: Types.ObjectId;
  refId: string;
  name: string;
  relation: 'Parent' | 'Father' | 'Mother' | 'Guardian' | 'Other';
  phone: string;
  email?: string;
  userId?: Types.ObjectId | null;
  studentIds: Types.ObjectId[];
  portalStatus: (typeof GUARDIAN_PORTAL_STATUSES)[number];
  lastLoginAt?: Date | null;
  pickupAuthorized: boolean;
  financialResponsible: boolean;
  custody: string;
  consents: { media: boolean | null; trips: boolean | null; medical: boolean | null };
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
    email: { type: String, lowercase: true, trim: true, maxlength: 254 },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    studentIds: [{ type: Schema.Types.ObjectId, ref: 'Student', required: true }],
    portalStatus: { type: String, enum: GUARDIAN_PORTAL_STATUSES, default: 'Invited', index: true },
    lastLoginAt: { type: Date, default: null },
    pickupAuthorized: { type: Boolean, default: false },
    financialResponsible: { type: Boolean, default: false },
    custody: { type: String, default: 'Not recorded', trim: true, maxlength: 300 },
    consents: {
      media: { type: Boolean, default: null },
      trips: { type: Boolean, default: null },
      medical: { type: Boolean, default: null },
    },
    note: { type: String, trim: true, maxlength: 600 },
  },
  { timestamps: true },
);

guardianSchema.index({ studentIds: 1 });
guardianSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } }, name: 'guardian_portal_unique' },
);
export const Guardian = model<IGuardian>('Guardian', guardianSchema);
