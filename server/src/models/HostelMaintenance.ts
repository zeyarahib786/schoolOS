import { Schema, model, Document, Types } from 'mongoose';

export interface IHostelMaintenance extends Document {
  refId: string;
  room: Types.ObjectId;
  issue: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In progress' | 'Resolved';
  reportedBy: Types.ObjectId;
  resolution?: string;
  history: Array<{ at: Date; actor: Types.ObjectId; reason: string; status: string }>;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const hostelMaintenanceSchema = new Schema<IHostelMaintenance>(
  {
    refId: { type: String, required: true, unique: true, trim: true },
    room: { type: Schema.Types.ObjectId, ref: 'HostelRoom', required: true, index: true },
    issue: { type: String, required: true, trim: true, maxlength: 300 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
    status: { type: String, enum: ['Open', 'In progress', 'Resolved'], default: 'Open', index: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    resolution: String,
    history: [
      { _id: false, at: Date, actor: { type: Schema.Types.ObjectId, ref: 'User' }, reason: String, status: String },
    ],
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
  },
  { timestamps: true },
);

export const HostelMaintenance = model<IHostelMaintenance>('HostelMaintenance', hostelMaintenanceSchema);
