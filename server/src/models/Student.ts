import { Schema, model, Document, Types } from 'mongoose';

/** Core student record fields follow the product data contract documented in
 * MONGODB-SCHEMA.md. `refId` stores the human-readable identifier (for example,
 * "ANS-1042") as an indexed field alongside MongoDB's `_id`.
 *
 * `guardianUserId` is a real Mongoose reference (closing a Stage 1 gap where guardian was a
 * plain string) - it's what makes ownership-based access control possible: a Parent-role user
 * can only be authorized to read students where this field matches their own user id. See
 * `student.ownership.ts` for the scoping logic this reference enables. */
/** `guardianUserId` is a real Mongoose reference (closing a Stage 1 gap where guardian was a
 * plain string) - it's what makes ownership-based access control possible: a Parent-role user
 * can only be authorized to read students where this field matches their own user id. See
 * `student.ownership.ts` for the scoping logic this reference enables.
 *
 * `studentUserId` closes a SECOND, later-discovered gap: nothing linked a Student-role user
 * account to their own Student document at all - a real problem once a module (LMS) needed
 * "a student can see/submit against their own coursework record." Optional, the same way
 * guardianUserId is - not every Student document necessarily has a corresponding login account
 * created for it yet. */
export interface IStudent extends Document {
  _id: Types.ObjectId;
  refId: string;
  name: string;
  grade: string;
  gender: 'Male' | 'Female';
  roll: string;
  guardianName: string;
  guardianUserId?: Types.ObjectId;
  studentUserId?: Types.ObjectId;
  phone: string;
  dateOfBirth?: Date;
  nationality?: string;
  guardianRelationship?: 'Father' | 'Mother' | 'Guardian' | 'Other';
  guardianEmail?: string;
  emergencyContact?: string;
  preferredLanguage?: string;
  address?: string;
  previousSchool?: string;
  previousGrade?: string;
  languages?: string;
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-' | 'Unknown';
  allergies?: string;
  medicalNotes?: string;
  transportRequirement?: 'No' | 'One-way' | 'Two-way';
  documents: Array<{
    key: 'id' | 'birth' | 'photo';
    label: string;
    fileId: Types.ObjectId;
    filename: string;
    contentType: string;
    size: number;
    uploadedAt: Date;
  }>;
  feeStatus: 'Paid' | 'Pending' | 'Overdue';
  attendancePct: number;
  gpa: number;
  status: 'Active' | 'Inactive' | 'Alumni';
  translations?: {
    en?: { name?: string; guardianName?: string };
    ar?: { name?: string; guardianName?: string };
    ur?: { name?: string; guardianName?: string };
    hi?: { name?: string; guardianName?: string };
  };
  enrollmentHistory: Array<{
    from: string;
    to: string;
    reason: string;
    effectiveDate: Date;
    changedAt: Date;
    changedBy: Types.ObjectId;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const studentDocumentSchema = new Schema(
  {
    key: { type: String, enum: ['id', 'birth', 'photo'], required: true },
    label: { type: String, required: true },
    fileId: { type: Schema.Types.ObjectId, required: true },
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, required: true },
  },
  { _id: false },
);

const studentSchema = new Schema<IStudent>(
  {
    enrollmentHistory: {
      type: [
        new Schema(
          {
            from: String,
            to: String,
            reason: String,
            effectiveDate: Date,
            changedAt: Date,
            changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    refId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    grade: { type: String, required: true, trim: true, index: true },
    gender: { type: String, enum: ['Male', 'Female'], required: true },
    roll: { type: String, required: true, trim: true },
    guardianName: { type: String, required: true, trim: true },
    guardianUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    studentUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    phone: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    nationality: { type: String, trim: true, maxlength: 80 },
    guardianRelationship: { type: String, enum: ['Father', 'Mother', 'Guardian', 'Other'] },
    guardianEmail: { type: String, trim: true, lowercase: true, maxlength: 254 },
    emergencyContact: { type: String, trim: true },
    preferredLanguage: { type: String, trim: true, maxlength: 60 },
    address: { type: String, trim: true, maxlength: 500 },
    previousSchool: { type: String, trim: true, maxlength: 160 },
    previousGrade: { type: String, trim: true, maxlength: 60 },
    languages: { type: String, trim: true, maxlength: 200 },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'] },
    allergies: { type: String, trim: true, maxlength: 500 },
    medicalNotes: { type: String, trim: true, maxlength: 1000 },
    transportRequirement: { type: String, enum: ['No', 'One-way', 'Two-way'], default: 'No' },
    documents: { type: [studentDocumentSchema], default: [] },
    feeStatus: { type: String, enum: ['Paid', 'Pending', 'Overdue'], default: 'Pending' },
    attendancePct: { type: Number, min: 0, max: 100, default: 100 },
    gpa: { type: Number, min: 0, max: 4, default: 0 },
    status: { type: String, enum: ['Active', 'Inactive', 'Alumni'], default: 'Active', index: true },
    translations: {
      type: Map,
      of: new Schema(
        {
          name: { type: String, trim: true },
          guardianName: { type: String, trim: true },
        },
        { _id: false },
      ),
      default: {},
    },
  },
  { timestamps: true },
);

studentSchema.index({ name: 'text', refId: 'text' });

studentSchema.index(
  { studentUserId: 1 },
  { name: 'student_portal_unique', unique: true, partialFilterExpression: { studentUserId: { $type: 'objectId' } } },
);

export const Student = model<IStudent>('Student', studentSchema);
