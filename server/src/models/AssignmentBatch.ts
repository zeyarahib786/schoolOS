import { model, Schema } from 'mongoose';
export const AssignmentBatch = model(
  'AssignmentBatch',
  new Schema(
    { requestKey: { type: String, required: true, unique: true }, fingerprint: { type: String, required: true } },
    { timestamps: true },
  ),
);
