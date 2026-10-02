import { Schema, model, Document, Types } from 'mongoose';

/** A "self-submit, other-approves" workflow - genuinely different from every prior module, where
 * a single fixed role set controlled all writes. Here, CREATE is available to any staff member
 * for their own claim (self-service, scoped via Staff.userId the same way Payroll's self-view
 * works); APPROVE/REJECT is restricted to finance oversight roles, matching Fees/Payroll. */
export interface IExpenseClaim extends Document {
  _id: Types.ObjectId;
  staff: Types.ObjectId;
  category: string;
  amount: number;
  description: string;
  expenseDate: Date;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: Types.ObjectId;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseClaimSchema = new Schema<IExpenseClaim>(
  {
    staff: { type: Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    expenseDate: { type: Date, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

export const ExpenseClaim = model<IExpenseClaim>('ExpenseClaim', expenseClaimSchema);
