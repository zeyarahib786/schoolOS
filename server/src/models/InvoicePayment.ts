import { Schema, model, Document, Types } from 'mongoose';

export interface IInvoicePayment extends Document {
  _id: Types.ObjectId;
  invoice: Types.ObjectId;
  student: Types.ObjectId;
  amount: number;
  currency: string;
  paymentMethod: 'Card' | 'Bank transfer' | 'Cash' | 'Cheque' | 'Online portal';
  reference?: string;
  idempotencyKey?: string;
  recordedBy: Types.ObjectId;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invoicePaymentSchema = new Schema<IInvoicePayment>(
  {
    invoice: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true, default: 'AED', trim: true, uppercase: true, minlength: 3, maxlength: 3 },
    paymentMethod: {
      type: String,
      enum: ['Card', 'Bank transfer', 'Cash', 'Cheque', 'Online portal'],
      required: true,
    },
    idempotencyKey: { type: String },
    reference: { type: String, trim: true, maxlength: 120 },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    paidAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true },
);

invoicePaymentSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);

export const InvoicePayment = model<IInvoicePayment>('InvoicePayment', invoicePaymentSchema);
