import { Schema, model, Document, Types } from 'mongoose';

/** Shared exam definition against which student results are scored. Subjects remain on the Exam
 * document and are managed through dedicated endpoints instead of being copied into results. */
export interface IExam extends Document {
  _id: Types.ObjectId;
  name: string;
  term: string;
  subjects: string[];
  maxMarks: number;
  passMark: number;
  locked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const examSchema = new Schema<IExam>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    term: { type: String, required: true, trim: true },
    subjects: {
      type: [String],
      required: true,
      validate: { validator: (v: string[]) => v.length > 0, message: 'At least one subject is required' },
    },
    maxMarks: { type: Number, required: true, min: 1, default: 100 },
    passMark: { type: Number, required: true, min: 0, default: 50 },
    locked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Exam = model<IExam>('Exam', examSchema);
