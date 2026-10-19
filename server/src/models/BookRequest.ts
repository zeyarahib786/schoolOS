import { Schema, model, Document, Types } from 'mongoose';

export interface IBookRequest extends Document {
  _id: Types.ObjectId;
  book: Types.ObjectId;
  student: Types.ObjectId;
  requestedBy: Types.ObjectId;
  note?: string;
  loan?: Types.ObjectId;
  decisionReason?: string;
  status: 'Pending' | 'Fulfilled' | 'Rejected' | 'Cancelled';
  fulfilledBy?: Types.ObjectId;
  fulfilledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bookRequestSchema = new Schema<IBookRequest>(
  {
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    note: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: ['Pending', 'Fulfilled', 'Rejected', 'Cancelled'], default: 'Pending', index: true },
    loan: { type: Schema.Types.ObjectId, ref: 'Loan' },
    decisionReason: { type: String, maxlength: 500 },
    fulfilledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    fulfilledAt: { type: Date },
  },
  { timestamps: true },
);

bookRequestSchema.index({ book: 1, student: 1, status: 1 });

export const BookRequest = model<IBookRequest>('BookRequest', bookRequestSchema);
