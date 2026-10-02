import { Schema, model, Document, Types } from 'mongoose';

export interface ILoan extends Document {
  _id: Types.ObjectId;
  book: Types.ObjectId;
  student: Types.ObjectId;
  issuedDate: Date;
  dueDate: Date;
  returnedDate?: Date;
  status: 'Active' | 'Returned' | 'Overdue';
  reminderCount: number;
  lastReminderAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const loanSchema = new Schema<ILoan>(
  {
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    issuedDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    returnedDate: { type: Date },
    status: { type: String, enum: ['Active', 'Returned', 'Overdue'], default: 'Active', index: true },
    reminderCount: { type: Number, default: 0, min: 0 },
    lastReminderAt: { type: Date },
  },
  { timestamps: true },
);

export const Loan = model<ILoan>('Loan', loanSchema);
