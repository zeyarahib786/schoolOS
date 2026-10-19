import { Schema, model, Document, Types } from 'mongoose';

export interface IInventoryItem extends Document {
  _id: Types.ObjectId;
  name: string;
  sku: string;
  category: string;
  quantityOnHand: number;
  reorderLevel: number;
  unitCost: number;
  supplier?: string;
  location?: string;
  condition: 'Good' | 'Worn' | 'Damaged';
  lastCounted?: Date;
  movements: Array<{ date: Date; type: string; quantityDelta: number; note?: string; recordedBy: Types.ObjectId }>;
  history: {
    at: Date;
    by: Types.ObjectId;
    reason: string;
    previous: {
      name: string;
      category: string;
      reorderLevel: number;
      unitCost: number;
      supplier?: string;
      location?: string;
      condition: string;
    };
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    history: [
      {
        at: Date,
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        previous: {
          name: String,
          category: String,
          reorderLevel: Number,
          unitCost: Number,
          supplier: String,
          location: String,
          condition: String,
        },
      },
    ],
    name: { type: String, required: true, trim: true, maxlength: 160 },
    sku: { type: String, required: true, unique: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    quantityOnHand: { type: Number, required: true, min: 0, default: 0 },
    reorderLevel: { type: Number, required: true, min: 0, default: 10 },
    unitCost: { type: Number, required: true, min: 0 },
    supplier: { type: String, trim: true, maxlength: 160 },
    location: { type: String, trim: true, maxlength: 160 },
    condition: { type: String, enum: ['Good', 'Worn', 'Damaged'], default: 'Good' },
    lastCounted: { type: Date },
    movements: {
      type: [
        {
          date: { type: Date, required: true },
          type: { type: String, required: true, maxlength: 80 },
          quantityDelta: { type: Number, required: true },
          note: { type: String, trim: true, maxlength: 300 },
          recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export const InventoryItem = model<IInventoryItem>('InventoryItem', inventoryItemSchema);
