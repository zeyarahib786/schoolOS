import { ApiError } from '../../utils/ApiError';
import mongoose, { FilterQuery } from 'mongoose';
import { InventoryItem, IInventoryItem } from '../../models/InventoryItem';
import { PurchaseOrder, IPurchaseOrder } from '../../models/PurchaseOrder';
import { CreateItemInput, ListItemsQuery, CreatePOInput, AdjustStockInput } from './inventory.validation';

export async function findManyItems(query: ListItemsQuery): Promise<{ items: IInventoryItem[]; total: number }> {
  const filter: FilterQuery<IInventoryItem> = {};
  if (query.category) filter.category = query.category;
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    InventoryItem.find(filter).sort({ name: 1 }).skip(skip).limit(query.limit),
    InventoryItem.countDocuments(filter),
  ]);
  return { items, total };
}

export function createItem(input: CreateItemInput): Promise<IInventoryItem> {
  return InventoryItem.create(input);
}

export function findItemById(id: string): Promise<IInventoryItem | null> {
  return InventoryItem.findById(id);
}

export function findManyPOs(): Promise<IPurchaseOrder[]> {
  return PurchaseOrder.find().sort({ createdAt: -1 }).populate('lines.item', 'name sku');
}

export function findPOById(id: string): Promise<IPurchaseOrder | null> {
  return PurchaseOrder.findById(id);
}

export function createPO(input: CreatePOInput, orderedBy: string): Promise<IPurchaseOrder> {
  return PurchaseOrder.create({
    refId: input.refId,
    supplier: input.supplier,
    lines: input.lines.map((l) => ({ item: l.itemId, quantity: l.quantity, unitCost: l.unitCost })),
    orderedBy,
    expectedDelivery: input.expectedDelivery ? new Date(input.expectedDelivery) : undefined,
    notes: input.notes,
  });
}

export function adjustStock(id: string, input: AdjustStockInput, recordedBy: string): Promise<IInventoryItem | null> {
  const availability = input.quantityDelta < 0 ? { quantityOnHand: { $gte: -input.quantityDelta } } : {};
  return InventoryItem.findOneAndUpdate(
    { _id: id, ...availability, ...(input.expectedUpdatedAt ? { updatedAt: new Date(input.expectedUpdatedAt) } : {}) },
    {
      $inc: { quantityOnHand: input.quantityDelta },
      $push: {
        movements: {
          date: new Date(),
          type: input.type,
          quantityDelta: input.quantityDelta,
          note: input.note,
          recordedBy,
        },
      },
    },
    { new: true, runValidators: true },
  );
}

export function setPOStatus(
  id: string,
  previous: string,
  status: 'Sent' | 'Cancelled',
  actor: string,
  expectedUpdatedAt?: string,
  reason?: string,
) {
  return PurchaseOrder.findOneAndUpdate(
    { _id: id, status: previous, ...(expectedUpdatedAt ? { updatedAt: new Date(expectedUpdatedAt) } : {}) },
    {
      $set: { status },
      $push: {
        history: { at: new Date(), by: actor, action: status, reason: reason || 'Recorded purchase-order transition' },
      },
    },
    { new: true },
  );
}

/**
 * A genuinely different transaction use case from Facilities': that one used a transaction to
 * make a CHECK-then-WRITE atomic (no overlap, then insert). This one uses a transaction for
 * ALL-OR-NOTHING atomicity across MULTIPLE separate document updates - every line item's stock
 * increment either all succeed together or none of them apply at all. Without this, a failure
 * partway through updating line 2 of a 3-line PO would leave line 1's stock incorrectly
 * incremented while line 3 was never touched - a real, silent data-corruption risk with a
 * naive sequential loop of individual updates outside a transaction.
 */
export async function receivePOAndUpdateStock(
  poId: string,
  actor: string,
  expectedUpdatedAt?: string,
  reason?: string,
): Promise<IPurchaseOrder> {
  const session = await mongoose.startSession();
  try {
    let updated: IPurchaseOrder | null = null;
    await session.withTransaction(async () => {
      const po = await PurchaseOrder.findById(poId).session(session);
      if (!po) throw Object.assign(new Error('PO_NOT_FOUND'), { code: 'PO_NOT_FOUND' });
      if (po.status !== 'Sent' || (expectedUpdatedAt && po.updatedAt.toISOString() !== expectedUpdatedAt))
        throw Object.assign(new Error('PO_NOT_SENT'), { code: 'PO_NOT_SENT' });

      for (const line of po.lines) {
        const item = await InventoryItem.findByIdAndUpdate(
          line.item,
          {
            $inc: { quantityOnHand: line.quantity },
            $push: {
              movements: {
                date: new Date(),
                type: 'Purchase order receipt',
                quantityDelta: line.quantity,
                note: po.refId + ' · ' + (reason || 'Confirmed physical receipt'),
                recordedBy: actor,
              },
            },
          },
          { session },
        );
        if (!item) throw ApiError.conflict('A purchase-order item is missing; no stock was received');
      }

      const result = await PurchaseOrder.findOneAndUpdate(
        { _id: poId, status: 'Sent' },
        {
          $set: { status: 'Received', receivedDate: new Date() },
          $push: {
            history: { at: new Date(), by: actor, action: 'Received', reason: reason || 'Confirmed physical receipt' },
          },
        },
        { new: true, session },
      );
      if (!result) throw Object.assign(new Error('PO_NOT_SENT'), { code: 'PO_NOT_SENT' });
      updated = result;
    });
    if (!updated) throw new Error('Receive transaction completed without producing a document');
    return updated;
  } finally {
    await session.endSession();
  }
}
