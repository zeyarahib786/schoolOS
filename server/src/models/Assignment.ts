import { Schema, model, Document, Types } from 'mongoose';

export interface IAssignment extends Document {
  _id: Types.ObjectId;
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

export const Assignment = model<IAssignment>('Assignment', assignmentSchema);
