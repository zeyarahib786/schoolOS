import { Schema, model, Document, Types } from 'mongoose';

export interface ITransportIncident extends Document {
  _id: Types.ObjectId;
  route: Types.ObjectId;
  type: 'Mechanical issue' | 'Traffic delay' | 'Accident (minor)' | 'Student behaviour' | 'Route deviation';
  severity: 'Minor' | 'Moderate' | 'Serious';
  occurredAt: Date;
  resolution?: string;
  resolvedAt?: Date;
  history: Array<{ at: Date; actor: Types.ObjectId; reason: string; status: string }>;
  location?: string;
  description: string;
  status: 'Open' | 'Resolved';
  reportedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const transportIncidentSchema = new Schema<ITransportIncident>(
  {
    route: { type: Schema.Types.ObjectId, ref: 'Route', required: true, index: true },
    type: {
      type: String,
      enum: ['Mechanical issue', 'Traffic delay', 'Accident (minor)', 'Student behaviour', 'Route deviation'],
      required: true,
    },
    severity: { type: String, enum: ['Minor', 'Moderate', 'Serious'], default: 'Minor' },
    occurredAt: { type: Date, default: Date.now },
    resolution: String,
    resolvedAt: Date,
    history: [
      { _id: false, at: Date, actor: { type: Schema.Types.ObjectId, ref: 'User' }, reason: String, status: String },
    ],
    location: { type: String, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['Open', 'Resolved'], default: 'Open', index: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const TransportIncident = model<ITransportIncident>('TransportIncident', transportIncidentSchema);
