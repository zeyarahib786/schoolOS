import { Schema, model, Document, Types } from 'mongoose';

/** One invoice is stored per student and term. `refId` provides the human-readable
 * INV-xxxx reference alongside MongoDB's `_id`. */
export interface IInvoice extends Document {
  _id: Types.ObjectId;
  refId: string;
  student: Types.ObjectId;
  term: string;
  amount: number;
  paidAmount: number;
  currency: string;
  dueDate: Date;
  status: 'Pending' | 'Paid' | 'Overdue';
  paidDate?: Date;
  paymentMethod?: 'Card' | 'Bank transfer' | 'Cash' | 'Cheque' | 'Online portal';
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    refId: { type: String, required: true, unique: true, trim: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    term: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, required: true, default: 'AED', trim: true, uppercase: true, minlength: 3, maxlength: 3 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['Pending', 'Paid', 'Overdue'], default: 'Pending', index: true },
    paidDate: { type: Date },
    paymentMethod: { type: String, enum: ['Card', 'Bank transfer', 'Cash', 'Cheque', 'Online portal'] },
  },
  { timestamps: true },
);

invoiceSchema.index({ student: 1, term: 1 });

export const Invoice = model<IInvoice>('Invoice', invoiceSchema);
