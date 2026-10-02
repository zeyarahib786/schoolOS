import { Schema, model, Document, Types } from 'mongoose';

export interface ICafeteriaTransaction extends Document {
  _id: Types.ObjectId;
  wallet: Types.ObjectId;
  type: 'TopUp' | 'Purchase';
  amount: number;
  description: string;
  createdAt: Date;
}

const cafeteriaTransactionSchema = new Schema<ICafeteriaTransaction>(
  {
    wallet: { type: Schema.Types.ObjectId, ref: 'CafeteriaWallet', required: true, index: true },
    type: { type: String, enum: ['TopUp', 'Purchase'], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    description: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const CafeteriaTransaction = model<ICafeteriaTransaction>('CafeteriaTransaction', cafeteriaTransactionSchema);
