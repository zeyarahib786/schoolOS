import { Schema, model, Document, Types } from 'mongoose';

export interface ICafeteriaAllergyPlan extends Document {
  student: Types.ObjectId;
  allergens: string;
  severity: 'Severe' | 'Moderate' | 'Mild';
  carePlan: string;
  createdBy: Types.ObjectId;
  history: {
    at: Date;
    by: Types.ObjectId;
    reason: string;
    previous: { allergens: string; severity: string; carePlan: string };
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const cafeteriaAllergyPlanSchema = new Schema<ICafeteriaAllergyPlan>(
  {
    history: [
      {
        at: { type: Date, required: true },
        by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        reason: { type: String, required: true },
        previous: { allergens: String, severity: String, carePlan: String },
      },
    ],
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
    allergens: { type: String, required: true, trim: true, maxlength: 300 },
    severity: { type: String, enum: ['Severe', 'Moderate', 'Mild'], required: true, index: true },
    carePlan: { type: String, required: true, trim: true, maxlength: 1000 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const CafeteriaAllergyPlan = model<ICafeteriaAllergyPlan>('CafeteriaAllergyPlan', cafeteriaAllergyPlanSchema);
