import { Schema, model, Document, Types } from 'mongoose';

/** Medical data - the most sensitive category this codebase handles, per
 * SECURITY-COMPLIANCE.md's own guidance to restrict read access more tightly than ordinary
 * records for this class of data. Ownership scoping here is identical in SHAPE to Behaviour's,
 * but the read-access role list is deliberately narrower (see health.ownership.ts) - Teacher is
 * excluded from unrestricted read here even though Teacher IS unrestricted for Behaviour, since a
 * teacher has a legitimate need to know about a classroom incident but not a blanket right to
 * every student's medical history. */
export interface IClinicVisit extends Document {
  _id: Types.ObjectId;
  student: Types.ObjectId;
  reason: string;
  treatment: string;
  outcome: 'Returned to class' | 'Sent home' | 'Referred to hospital' | 'Under observation';
  severity: 'Routine' | 'Urgent' | 'Emergency';
  vitals?: string;
  medicine?: string;
  visitDate?: string;
  followUpDate?: string;
  followUpNote?: string;
  history: Array<{
    changedAt: Date;
    changedBy: Types.ObjectId;
    reason: string;
    previousOutcome: string;
    outcome: string;
    parentContacted: boolean;
    followUpDate?: string;
  }>;
  parentContacted: boolean;
  parentContactedAt?: Date;
  recordedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const clinicVisitSchema = new Schema<IClinicVisit>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    treatment: { type: String, required: true, trim: true, maxlength: 500 },
    outcome: {
      type: String,
      enum: ['Returned to class', 'Sent home', 'Referred to hospital', 'Under observation'],
      required: true,
    },
    severity: { type: String, enum: ['Routine', 'Urgent', 'Emergency'], default: 'Routine' },
    vitals: { type: String, trim: true, maxlength: 300 },
    medicine: { type: String, trim: true, maxlength: 300 },
    visitDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    followUpDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    followUpNote: { type: String, trim: true, maxlength: 500 },
    history: [
      {
        _id: false,
        changedAt: { type: Date, required: true },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        reason: { type: String, required: true, maxlength: 500 },
        previousOutcome: String,
        outcome: String,
        parentContacted: Boolean,
        followUpDate: String,
      },
    ],
    parentContacted: { type: Boolean, default: false },
    parentContactedAt: Date,
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

clinicVisitSchema.index({ visitDate: 1, followUpDate: 1 });
export const ClinicVisit = model<IClinicVisit>('ClinicVisit', clinicVisitSchema);
