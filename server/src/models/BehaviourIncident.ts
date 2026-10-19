import { Schema, model, Document, Types } from 'mongoose';

export interface IBehaviourIncident extends Document {
  _id: Types.ObjectId;
  student: Types.ObjectId;
  category: string;
  description: string;
  severity: 'Minor' | 'Moderate' | 'Serious';
  reportedBy: Types.ObjectId;
  actionTaken?: string;
  type: 'Merit' | 'Incident' | 'Detention' | 'Pastoral note';
  points: number;
  location?: string;
  witness?: string;
  incidentDate?: string;
  followUpDate?: string;
  visibility: 'Shared with family' | 'Staff only';
  assignedTo?: Types.ObjectId;
  history: Array<{
    changedAt: Date;
    changedBy: Types.ObjectId;
    from: string;
    to: string;
    reason: string;
    actionTaken?: string;
  }>;
  status: 'Logged' | 'Escalated' | 'Closed';
  createdAt: Date;
  updatedAt: Date;
}

const behaviourIncidentSchema = new Schema<IBehaviourIncident>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    severity: { type: String, enum: ['Minor', 'Moderate', 'Serious'], default: 'Minor', index: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actionTaken: { type: String, trim: true, maxlength: 1000 },
    type: { type: String, enum: ['Merit', 'Incident', 'Detention', 'Pastoral note'], default: 'Incident', index: true },
    points: { type: Number, default: -2 },
    location: { type: String, trim: true, maxlength: 120 },
    witness: { type: String, trim: true, maxlength: 120 },
    incidentDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    followUpDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    visibility: { type: String, enum: ['Shared with family', 'Staff only'], default: 'Shared with family' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    history: [
      {
        _id: false,
        changedAt: { type: Date, required: true },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        from: String,
        to: String,
        reason: { type: String, required: true, maxlength: 500 },
        actionTaken: { type: String, maxlength: 1000 },
      },
    ],
    status: { type: String, enum: ['Logged', 'Escalated', 'Closed'], default: 'Logged', index: true },
  },
  { timestamps: true },
);

export const BehaviourIncident = model<IBehaviourIncident>('BehaviourIncident', behaviourIncidentSchema);
