import { Schema, model, Types } from 'mongoose';
import { AiRequest, AiContent } from '../modules/lms/lms.ai.validation';
export interface ITeacherAiDraft {
  owner: Types.ObjectId;
  requestId: string;
  fingerprint: string;
  request: AiRequest;
  content?: AiContent;
  status: 'Generating' | 'Draft' | 'Applying' | 'Applied' | 'Failed';
  failureMessage?: string;
  model: string;
  provider: 'openai' | 'gemini' | 'groq';
  sources: Array<{ title: string; updatedAt: string }>;
  facts: Record<string, unknown>;
  sourceVersion?: string;
  appliedRecord?: string;
  appliedAction?: string;
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<ITeacherAiDraft>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requestId: { type: String, required: true },
    fingerprint: String,
    request: { type: Schema.Types.Mixed, required: true },
    content: Schema.Types.Mixed,
    status: { type: String, enum: ['Generating', 'Draft', 'Applying', 'Applied', 'Failed'], default: 'Generating' },
    failureMessage: String,
    model: String,
    provider: { type: String, enum: ['openai', 'gemini', 'groq'], default: 'openai' },
    sources: [{ _id: false, title: String, updatedAt: String }],
    facts: Schema.Types.Mixed,
    sourceVersion: String,
    appliedRecord: String,
    appliedAction: String,
  },
  { timestamps: true },
);
schema.index({ owner: 1, requestId: 1 }, { unique: true });
export const TeacherAiDraft = model<ITeacherAiDraft>('TeacherAiDraft', schema);
