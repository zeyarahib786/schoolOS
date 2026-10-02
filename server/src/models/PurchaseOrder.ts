import { Schema, model, Document, Types } from 'mongoose';

export interface IPurchaseOrderLine {
  item: Types.ObjectId;
  quantity: number;
  unitCost: number;
}

export interface IPurchaseOrder extends Document {
  _id: Types.ObjectId;
  refId: string;
  supplier: string;
  lines: IPurchaseOrderLine[];
  status: 'Draft' | 'Sent' | 'Received' | 'Cancelled';
  orderedBy: Types.ObjectId;
  receivedDate?: Date;
  expectedDelivery?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseOrderLineSchema = new Schema<IPurchaseOrderLine>(
  {
    item: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    refId: { type: String, required: true, unique: true, trim: true },
    supplier: { type: String, required: true, trim: true, maxlength: 160 },
    lines: {
      type: [purchaseOrderLineSchema],
      required: true,
      validate: {
        validator: (v: IPurchaseOrderLine[]) => v.length > 0,
        message: 'A purchase order needs at least one line item',
      },
    },
    status: { type: String, enum: ['Draft', 'Sent', 'Received', 'Cancelled'], default: 'Draft', index: true },
    orderedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receivedDate: { type: Date },
    expectedDelivery: { type: Date },
    notes: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true },
);

export const PurchaseOrder = model<IPurchaseOrder>('PurchaseOrder', purchaseOrderSchema);
