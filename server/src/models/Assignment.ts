import { Schema, model, Document, Types } from 'mongoose';
import { AssessmentQuestion } from '../modules/lms/lms.assessment';

export interface IAssignment extends Document {
  _id: Types.ObjectId;
  course?: Types.ObjectId;
  academicYear: string;
  status: 'Draft' | 'Scheduled' | 'Published' | 'Closed';
  acceptLate: boolean;
  publishAt?: Date;
  publisher?: Types.ObjectId;
  publicationEvent?: string;
  publicationNotifiedAt?: Date;
  notifyEmail: boolean;
  remindersEnabled: boolean;
  remindedBeforeFor?: Date;
  remindedOverdueFor?: Date;
  reminderSummary?: string;
  automationSummary?: string;
  batchKey?: string;

  history: Array<{
    at: Date;
    actor: Types.ObjectId;
    reason: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  }>;
  questions: AssessmentQuestion[];
  title: string;
  description: string;
  subject: string;
  grade: string;
  dueDate: Date;
  maxScore: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course' },
    academicYear: { type: String, default: 'Legacy' },
    status: { type: String, enum: ['Draft', 'Scheduled', 'Published', 'Closed'], default: 'Published', index: true },
    publishAt: { type: Date, index: true },
    publisher: { type: Schema.Types.ObjectId, ref: 'User' },
    publicationEvent: String,
    publicationNotifiedAt: Date,
    remindersEnabled: { type: Boolean, default: false },
    reminderSummary: String,
    remindedBeforeFor: Date,
    remindedOverdueFor: Date,
    notifyEmail: { type: Boolean, default: false },
    automationSummary: String,
    batchKey: String,
    acceptLate: { type: Boolean, default: true },
    history: [
      {
        _id: false,
        at: Date,
        actor: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        before: Schema.Types.Mixed,
        after: Schema.Types.Mixed,
      },
    ],
    questions: {
      type: [
        new Schema<AssessmentQuestion>(
          {
            id: String,
            type: { type: String, enum: ['MCQ', 'ShortAnswer'] },
            prompt: String,
            options: [String],
            answer: String,
            marks: Number,
            rubric: String,
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    subject: { type: String, required: true, trim: true, index: true },
    grade: { type: String, required: true, trim: true, index: true },
    dueDate: { type: Date, required: true },
    maxScore: { type: Number, required: true, min: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

assignmentSchema.index(
  { batchKey: 1, grade: 1 },
  { unique: true, partialFilterExpression: { batchKey: { $type: 'string' } } },
);
export const Assignment = model<IAssignment>('Assignment', assignmentSchema);
