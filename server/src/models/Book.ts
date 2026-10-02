import { Schema, model, Document, Types } from 'mongoose';

/** `totalCopies` and `availableCopies` are separate, real counters - not a computed field, since
 * availability must decrement/increment atomically as loans are issued/returned (see
 * library.service.ts's use of a single findOneAndUpdate with a copies-available guard, which is
 * what actually prevents two concurrent loan requests from both succeeding when only one copy
 * remains). */
export interface IBook extends Document {
  _id: Types.ObjectId;
  isbn: string;
  title: string;
  author: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  createdAt: Date;
  updatedAt: Date;
}

const bookSchema = new Schema<IBook>(
  {
    isbn: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    author: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, index: true },
    totalCopies: { type: Number, required: true, min: 0 },
    availableCopies: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

bookSchema.index({ title: 'text', author: 'text' });

export const Book = model<IBook>('Book', bookSchema);
