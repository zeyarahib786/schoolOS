import { Document, Schema, model, Types } from 'mongoose';
export interface IFeeHead extends Document {
  _id: Types.ObjectId;
  name: string;
  appliesTo: string;
  amount: number;
  currency: string;
  frequency: 'Annual' | 'Term' | 'One-time';
  status: 'Active' | 'Archived';
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<IFeeHead>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    appliesTo: { type: String, trim: true, maxlength: 100, default: 'All grades' },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true },
    frequency: { type: String, enum: ['Annual', 'Term', 'One-time'], default: 'Term' },
    status: { type: String, enum: ['Active', 'Archived'], default: 'Active' },
  },
  { timestamps: true },
);
export const FeeHead = model<IFeeHead>('FeeHead', schema);
