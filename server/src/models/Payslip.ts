import { Schema, model, Document, Types } from 'mongoose';

/** One payslip per (staff, month). Net pay is a real stored field here (unlike Exam's
 * deliberately-never-stored average) because a payslip is a point-in-time financial record that
 * must remain exactly what was paid even if the staff member's basic salary changes later - the
 * opposite reasoning from Exams, and worth being explicit about why the same "always compute, never
 * store" principle doesn't apply universally. */
export interface IPayslip extends Document {
  _id: Types.ObjectId;
  staff: Types.ObjectId;
  currency: string;
  month: string; // e.g. "2026-06"
  basicSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  status: 'Draft' | 'Processed' | 'Paid';
  paidDate?: Date;
  paymentReference?: string;
  paymentMethod?: string;
  paidBy?: Types.ObjectId;
  employeeSnapshot?: { name: string; refId: string; designation: string };
  corrections: Array<{ at: Date; actor: Types.ObjectId; reason: string; previousNet: number; net: number }>;
  createdAt: Date;
  updatedAt: Date;
}

const payslipSchema = new Schema<IPayslip>(
  {
    staff: { type: Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    currency: { type: String, default: 'AED' },
    month: { type: String, required: true, match: [/^\d{4}-\d{2}$/, 'month must be in YYYY-MM format'] },
    basicSalary: { type: Number, required: true, min: 0 },
    allowances: { type: Number, required: true, min: 0, default: 0 },
    deductions: { type: Number, required: true, min: 0, default: 0 },
    netPay: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['Draft', 'Processed', 'Paid'], default: 'Draft', index: true },
    paidDate: { type: Date },
    paymentReference: { type: String, maxlength: 120 },
    paymentMethod: String,
    paidBy: { type: Schema.Types.ObjectId, ref: 'User' },
    employeeSnapshot: { name: String, refId: String, designation: String },
    corrections: [
      {
        _id: false,
        at: Date,
        actor: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String, maxlength: 500 },
        previousNet: Number,
        net: Number,
      },
    ],
  },
  { timestamps: true },
);

// One payslip per staff member per month - re-running payroll for a month replaces the existing
// draft rather than creating a second record for the same period.
payslipSchema.index({ staff: 1, month: 1 }, { unique: true });

export const Payslip = model<IPayslip>('Payslip', payslipSchema);
