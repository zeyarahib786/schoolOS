import { Schema, model, Document, Types } from 'mongoose';

/** One result document per exam and student. Average, grade, and rank are computed from scores
 * at read time so corrected marks cannot leave derived values stale. */
export interface IExamScore {
  subject: string;
  marks: number;
}

export interface IExamResult extends Document {
  _id: Types.ObjectId;
  exam: Types.ObjectId;
  student: Types.ObjectId;
  scores: IExamScore[];
  recordedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const examScoreSchema = new Schema<IExamScore>(
  {
    subject: { type: String, required: true, trim: true },
    marks: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const examResultSchema = new Schema<IExamResult>(
  {
    exam: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    scores: {
      type: [examScoreSchema],
      required: true,
      validate: { validator: (v: IExamScore[]) => v.length > 0, message: 'At least one subject score is required' },
    },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// One result per student per exam - re-recording replaces the existing document (see
// exam.service.ts's upsert-not-duplicate behavior for correcting a mark), never creates a second.
examResultSchema.index({ exam: 1, student: 1 }, { unique: true });

export const ExamResult = model<IExamResult>('ExamResult', examResultSchema);
