import { Document, model, Schema, Types } from 'mongoose';

export const CRM_STAGES = ['New', 'Contacted', 'Toured', 'Application', 'Won'] as const;
export const CRM_SOURCES = [
  'Website',
  'Walk-in',
  'Referral',
  'Agent',
  'Event',
  'Instagram',
  'Facebook',
  'Google',
] as const;
export const CRM_TEMPERATURES = ['Hot', 'Warm', 'Cold'] as const;

export interface ICrmLead extends Document {
  _id: Types.ObjectId;
  name: string;
  grade: string;
  stage: (typeof CRM_STAGES)[number];
  source: (typeof CRM_SOURCES)[number];
  phone?: string;
  guardian?: string;
  guardianEmail?: string;
  owner: string;
  ownerUserId?: Types.ObjectId;
  applicationId?: Types.ObjectId;
  temperature: (typeof CRM_TEMPERATURES)[number];
  followUpDate?: Date;
  followUpNotifiedFor?: Date;
  followUpType?: string;
  archived: boolean;
  archiveReason?: string;
  lastActivityAt: Date;
  activityLog: Array<{ action: string; occurredAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema(
  {
    action: { type: String, required: true, trim: true, maxlength: 600 },
    occurredAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const crmLeadSchema = new Schema<ICrmLead>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    grade: { type: String, required: true, trim: true, maxlength: 30, index: true },
    stage: { type: String, enum: CRM_STAGES, required: true, default: 'New', index: true },
    source: { type: String, enum: CRM_SOURCES, required: true, default: 'Website', index: true },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    guardian: { type: String, trim: true, maxlength: 120 },
    guardianEmail: { type: String, trim: true, lowercase: true, maxlength: 254 },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    applicationId: { type: Schema.Types.ObjectId, ref: 'AdmissionApplication' },
    owner: { type: String, required: true, trim: true, maxlength: 120, default: 'Front Office' },
    temperature: { type: String, enum: CRM_TEMPERATURES, required: true, default: 'Warm', index: true },
    followUpNotifiedFor: Date,
    followUpDate: { type: Date, index: true },
    followUpType: { type: String, trim: true, maxlength: 80 },
    archived: { type: Boolean, required: true, default: false, index: true },
    archiveReason: { type: String, trim: true, maxlength: 600 },
    lastActivityAt: { type: Date, required: true, default: Date.now, index: true },
    activityLog: { type: [activitySchema], default: [] },
  },
  { timestamps: true },
);

crmLeadSchema.index({ name: 1, phone: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
export const CrmLead = model<ICrmLead>('CrmLead', crmLeadSchema);
