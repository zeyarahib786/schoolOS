import { Schema, model, Document, Types } from 'mongoose';

export interface ICafeteriaTransaction extends Document {
  _id: Types.ObjectId;
  wallet: Types.ObjectId;
  type: 'TopUp' | 'Purchase';
  amount: number;
  description: string;
  requestId?: string;
  method?: string;
  reference?: string;
  recordedBy?: Types.ObjectId;
  balanceAfter?: number;
  createdAt: Date;
}

const cafeteriaTransactionSchema = new Schema<ICafeteriaTransaction>(
  {
    requestId: { type: String, maxlength: 100 },
    method: { type: String, maxlength: 40 },
    reference: { type: String, maxlength: 200 },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    balanceAfter: { type: Number, min: 0 },
    wallet: { type: Schema.Types.ObjectId, ref: 'CafeteriaWallet', required: true, index: true },
    type: { type: String, enum: ['TopUp', 'Purchase'], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    description: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

cafeteriaTransactionSchema.index(
  { wallet: 1, requestId: 1 },
  { unique: true, partialFilterExpression: { requestId: { $type: 'string' } } },
);

export const CafeteriaTransaction = model<ICafeteriaTransaction>('CafeteriaTransaction', cafeteriaTransactionSchema);
