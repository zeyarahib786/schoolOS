import { Schema, model, Document, Types } from 'mongoose';

export interface ISurveyQuestion {
  questionText: string;
  options: string[];
}

export interface ISurvey extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  questions: ISurveyQuestion[];
  status: 'Draft' | 'Scheduled' | 'Active' | 'Closed';
  scheduledAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const surveyQuestionSchema = new Schema<ISurveyQuestion>(
  {
    questionText: { type: String, required: true, trim: true, maxlength: 300 },
    options: {
      type: [String],
      required: true,
      validate: { validator: (v: string[]) => v.length >= 2, message: 'Each question needs at least 2 options' },
    },
  },
  { _id: false },
);

const surveySchema = new Schema<ISurvey>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    questions: {
      type: [surveyQuestionSchema],
      required: true,
      validate: { validator: (v: ISurveyQuestion[]) => v.length > 0, message: 'A survey needs at least one question' },
    },
    status: { type: String, enum: ['Draft', 'Scheduled', 'Active', 'Closed'], default: 'Draft', index: true },
    scheduledAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const Survey = model<ISurvey>('Survey', surveySchema);
