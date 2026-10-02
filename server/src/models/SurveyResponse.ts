import { Schema, model, Document, Types } from 'mongoose';

export interface ISurveyAnswer {
  questionIndex: number;
  selectedOption: string;
}

export interface ISurveyResponse extends Document {
  _id: Types.ObjectId;
  survey: Types.ObjectId;
  respondent: Types.ObjectId;
  answers: ISurveyAnswer[];
  createdAt: Date;
  updatedAt: Date;
}

const surveyAnswerSchema = new Schema<ISurveyAnswer>(
  {
    questionIndex: { type: Number, required: true, min: 0 },
    selectedOption: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const surveyResponseSchema = new Schema<ISurveyResponse>(
  {
    survey: { type: Schema.Types.ObjectId, ref: 'Survey', required: true, index: true },
    respondent: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    answers: {
      type: [surveyAnswerSchema],
      required: true,
      validate: { validator: (v: ISurveyAnswer[]) => v.length > 0, message: 'At least one answer is required' },
    },
  },
  { timestamps: true },
);

// One response per user per survey - re-submitting is rejected, not silently overwritten
// (unlike Exams' correction-friendly upsert - a survey response shouldn't be quietly replaceable
// by the respondent after the fact, since that would undermine the integrity of a poll others may
// already be viewing aggregate results for).
surveyResponseSchema.index({ survey: 1, respondent: 1 }, { unique: true });

export const SurveyResponse = model<ISurveyResponse>('SurveyResponse', surveyResponseSchema);
