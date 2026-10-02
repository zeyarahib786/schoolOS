import { Schema, model, Document, Types } from 'mongoose';

export interface ICertificate extends Document {
  _id: Types.ObjectId;
  certNumber: string;
  student: Types.ObjectId;
  type: 'Bonafide' | 'Transfer' | 'Character' | 'Study' | 'ReportCard' | 'Provisional';
  purpose?: string;
  status: 'Pending' | 'Issued' | 'Rejected';
  requestedBy?: Types.ObjectId;
  issuedBy?: Types.ObjectId;
  issuedDate?: Date;
  decisionBy?: Types.ObjectId;
  decisionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = new Schema<ICertificate>(
  {
    certNumber: { type: String, required: true, unique: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    type: { type: String, enum: ['Bonafide', 'Transfer', 'Character', 'Study', 'ReportCard', 'Provisional'], required: true, index: true },
    purpose: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: ['Pending', 'Issued', 'Rejected'], default: 'Issued', index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    issuedDate: Date,
    decisionBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decisionAt: Date,
  },
  { timestamps: true },
);

export const Certificate = model<ICertificate>('Certificate', certificateSchema);
