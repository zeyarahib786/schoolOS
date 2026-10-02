import { Schema, model, Document } from 'mongoose';

/** MongoDB has no native auto-increment - this is the standard atomic-counter pattern for
 * generating sequential, gap-free-per-key numbers (e.g. "TC-2026-0001", "TC-2026-0002") safely
 * under concurrent requests. `_id` is the counter's own key (e.g. "Transfer-2026"), not a
 * generated ObjectId - one document per (certificate type, year) combination, which is why the
 * Document generic's default ObjectId _id type has to be overridden explicitly here. */
export interface ICounter extends Document<string> {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

export const Counter = model<ICounter>('Counter', counterSchema);
