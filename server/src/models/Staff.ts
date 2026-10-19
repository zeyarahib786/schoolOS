import { Schema, model, Document, Types } from 'mongoose';

/** Staff record fields follow the product data contract in MONGODB-SCHEMA.md.
 * `refId` provides a human-readable reference alongside MongoDB's `_id`. */
export interface IStaff extends Document {
  _id: Types.ObjectId;
  refId: string;
  name: string;
  designation: string;
  department: string;
  type: 'Teaching' | 'Non-Teaching';
  status: 'Active' | 'Onboarding' | 'On Leave' | 'Inactive';
  email: string;
  phone: string;
  joinedDate: Date;
  userId?: Types.ObjectId; // links to a portal login account, if one exists - optional, mirrors Student.guardianUserId
  profileHistory: Array<{
    changedAt: Date;
    changedBy: Types.ObjectId;
    reason: string;
    fromStatus: string;
    toStatus: string;
    previousLeaveBalance?: number;
    leaveBalance?: number;
  }>;
  annualLeaveRemaining: number; // days; decremented atomically at leave APPROVAL time (see leave module)
  documents: Array<{
    key: 'id' | 'degree' | 'photo' | 'experience' | 'visa' | 'attestation';
    label: string;
    fileId: Types.ObjectId;
    filename: string;
    contentType: string;
    size: number;
    uploadedAt: Date;
  }>;
  onboarding: Array<{ key: string; label: string; done: boolean }>;
  createdAt: Date;
  updatedAt: Date;
}

const staffDocumentSchema = new Schema(
  {
    key: { type: String, enum: ['id', 'degree', 'photo', 'experience', 'visa', 'attestation'], required: true },
    label: { type: String, required: true },
    fileId: { type: Schema.Types.ObjectId, required: true },
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, required: true },
  },
  { _id: false },
);

const onboardingSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    done: { type: Boolean, default: false },
  },
  { _id: false },
);
const defaultOnboarding = () =>
  [
    ['offer', 'Offer letter accepted'],
    ['contract', 'Employment contract signed'],
    ['documents', 'Documents verified (passport, certificates)'],
    ['visa', 'Visa / labour card processed'],
    ['account', 'IT account & email setup'],
    ['induction', 'Induction & orientation'],
  ].map(([key, label]) => ({ key, label, done: false }));

const staffSchema = new Schema<IStaff>(
  {
    refId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    designation: { type: String, required: true, trim: true, maxlength: 80 },
    department: { type: String, required: true, trim: true, index: true },
    type: { type: String, enum: ['Teaching', 'Non-Teaching'], required: true, index: true },
    status: { type: String, enum: ['Active', 'Onboarding', 'On Leave', 'Inactive'], default: 'Active', index: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    phone: { type: String, required: true, trim: true },
    joinedDate: { type: Date, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    profileHistory: [
      {
        _id: false,
        changedAt: { type: Date, required: true },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        reason: { type: String, required: true, maxlength: 500 },
        fromStatus: String,
        toStatus: String,
        previousLeaveBalance: Number,
        leaveBalance: Number,
      },
    ],
    annualLeaveRemaining: { type: Number, min: 0, default: 30 },
    documents: { type: [staffDocumentSchema], default: [] },
    onboarding: { type: [onboardingSchema], default: defaultOnboarding },
  },
  { timestamps: true },
);

staffSchema.index({ name: 'text', refId: 'text' });

export const Staff = model<IStaff>('Staff', staffSchema);
