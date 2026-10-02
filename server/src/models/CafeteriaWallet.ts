import { Schema, model, Document, Types } from 'mongoose';

export interface ICafeteriaWallet extends Document {
  _id: Types.ObjectId;
  student: Types.ObjectId;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

const cafeteriaWalletSchema = new Schema<ICafeteriaWallet>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
    balance: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
);

export const CafeteriaWallet = model<ICafeteriaWallet>('CafeteriaWallet', cafeteriaWalletSchema);
