import { Schema, model, Document, Types } from 'mongoose';

export interface ICertificate extends Document {
  _id: Types.ObjectId;
  certNumber: string;
  student: Types.ObjectId;
  type: 'Bonafide' | 'Transfer' | 'Character' | 'Study' | 'ReportCard' | 'Provisional';
  purpose?: string;
  assessmentSnapshot?: {
    examName: string;
    term: string;
    studentName: string;
    studentRef: string;
    grade: string;
    maxMarks: number;
    passMark: number;
    averagePercent: number;
    letterGrade: string;
    scores: Array<{ subject: string; marks: number }>;
  };
  status: 'Pending' | 'Issued' | 'Rejected' | 'Cancelled';
  requestedBy?: Types.ObjectId;
  issuedBy?: Types.ObjectId;
  issuedDate?: Date;
  decisionBy?: Types.ObjectId;
  decisionAt?: Date;
  decisionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = new Schema<ICertificate>(
  {
    certNumber: { type: String, required: true, unique: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    type: {
      type: String,
      enum: ['Bonafide', 'Transfer', 'Character', 'Study', 'ReportCard', 'Provisional'],
      required: true,
      index: true,
    },
    assessmentSnapshot: {
      type: new Schema(
        {
          examName: String,
          term: String,
          studentName: String,
          studentRef: String,
          grade: String,
          maxMarks: Number,
          passMark: Number,
          averagePercent: Number,
          letterGrade: String,
          scores: [{ subject: String, marks: Number }],
        },
        { _id: false },
      ),
    },
    purpose: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: ['Pending', 'Issued', 'Rejected', 'Cancelled'], default: 'Issued', index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    issuedDate: Date,
    decisionBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decisionAt: Date,
    decisionReason: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

export const Certificate = model<ICertificate>('Certificate', certificateSchema);
