import { model, Schema } from 'mongoose';
export const AssignmentTemplate = model(
  'AssignmentTemplate',
  new Schema(
    {
      name: { type: String, required: true, trim: true, maxlength: 120 },
      title: { type: String, required: true, trim: true, maxlength: 160 },
      description: { type: String, required: true, trim: true, maxlength: 2000 },
      subject: { type: String, required: true, trim: true, maxlength: 80 },
      maxScore: { type: Number, required: true, min: 1, max: 10000 },
      acceptLate: { type: Boolean, default: true },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      shared: { type: Boolean, default: false },
    },
    { timestamps: true },
  ),
);
