import { Schema, model, Document, Types } from 'mongoose';

export interface IAdmissionApplication extends Document {
  _id: Types.ObjectId;
  applicantName: string;
  gradeAppliedFor: string;
  gender?: 'Male' | 'Female';
  guardianName: string;
  phone: string;
  dateOfBirth?: Date;
  nationality?: string;
  guardianRelationship?: 'Father' | 'Mother' | 'Guardian' | 'Other';
  guardianEmail?: string;
  source?: 'Website' | 'Walk-in' | 'Referral' | 'Agent' | 'Event';
  previousSchool?: string;
  status: 'Applied' | 'Shortlisted' | 'Interviewed' | 'Accepted' | 'Enrolled' | 'Rejected' | 'Waitlisted';
  notes?: string;
  decisionReason?: string;
  decisionOutcome?: 'Rejected' | 'Withdrawn' | 'Deferred to next intake';
  previousStatus?: 'Applied' | 'Shortlisted' | 'Interviewed' | 'Accepted';
  documents: Array<{
    key: 'id' | 'birth' | 'photo' | 'report' | 'immun' | 'tc';
    label: string;
    fileId?: Types.ObjectId;
    filename?: string;
    contentType?: string;
    size?: number;
    uploadedAt?: Date;
    verifiedAt?: Date;
  }>;
  history: Array<{
    from?: string;
    to: string;
    reason?: string;
    outcome?: string;
    performedBy: Types.ObjectId;
    at: Date;
  }>;
  enrolledStudent?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const admissionDocumentSchema = new Schema(
  {
    key: { type: String, enum: ['id', 'birth', 'photo', 'report', 'immun', 'tc'], required: true },
    label: { type: String, required: true },
    fileId: { type: Schema.Types.ObjectId },
    filename: { type: String },
    contentType: { type: String },
    size: { type: Number },
    uploadedAt: { type: Date },
    verifiedAt: { type: Date },
  },
  { _id: false },
);

const historySchema = new Schema(
  {
    from: { type: String },
    to: { type: String, required: true },
    reason: { type: String, maxlength: 400 },
    outcome: { type: String, enum: ['Rejected', 'Withdrawn', 'Deferred to next intake'] },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, required: true },
  },
  { _id: false },
);

const admissionApplicationSchema = new Schema<IAdmissionApplication>(
  {
    applicantName: { type: String, required: true, trim: true, maxlength: 120 },
    gradeAppliedFor: { type: String, required: true, trim: true, index: true },
    // CRM conversion preserves the legacy lead shape, which did not collect gender.
    // Direct applications still require it through request validation.
    gender: { type: String, enum: ['Male', 'Female'] },
    guardianName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    nationality: { type: String, trim: true, maxlength: 80 },
    guardianRelationship: { type: String, enum: ['Father', 'Mother', 'Guardian', 'Other'] },
    guardianEmail: { type: String, trim: true, lowercase: true, maxlength: 254 },
    source: { type: String, enum: ['Website', 'Walk-in', 'Referral', 'Agent', 'Event'] },
    previousSchool: { type: String, trim: true, maxlength: 160 },
    status: {
      type: String,
      enum: ['Applied', 'Shortlisted', 'Interviewed', 'Accepted', 'Enrolled', 'Rejected', 'Waitlisted'],
      default: 'Applied',
      index: true,
    },
    notes: { type: String, trim: true, maxlength: 1000 },
    decisionReason: { type: String, trim: true, maxlength: 400 },
    decisionOutcome: { type: String, enum: ['Rejected', 'Withdrawn', 'Deferred to next intake'] },
    previousStatus: { type: String, enum: ['Applied', 'Shortlisted', 'Interviewed', 'Accepted'] },
    documents: { type: [admissionDocumentSchema], default: [] },
    history: { type: [historySchema], default: [] },
    enrolledStudent: { type: Schema.Types.ObjectId, ref: 'Student' },
  },
  { timestamps: true },
);

export const AdmissionApplication = model<IAdmissionApplication>('AdmissionApplication', admissionApplicationSchema);
