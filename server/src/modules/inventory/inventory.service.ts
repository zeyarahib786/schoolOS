import { ApiError } from '../../utils/ApiError';
import { IInventoryItem } from '../../models/InventoryItem';
import { IPurchaseOrder } from '../../models/PurchaseOrder';
import * as repo from './inventory.repository';
import { CreateItemInput, ListItemsQuery, CreatePOInput, AdjustStockInput } from './inventory.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role, WRITE_ROLES } from '../../types/roles';
import { canTransitionPO, POStatus } from './po.state-machine';
import { logAudit } from '../audit/audit.service';

function canManageInventory(role: Role): boolean {
  return WRITE_ROLES.includes(role) || role === 'Accountant';
}

export async function addItem(input: CreateItemInput, requester: AuthenticatedUser): Promise<IInventoryItem> {
  if (!canManageInventory(requester.role)) throw ApiError.forbidden('Insufficient role to add an inventory item');
  try { const item = await repo.createItem(input); await logAudit(`Added inventory item ${item.name}`, 'Inventory', requester.id); return item; }
  catch (error) { if ((error as { code?: number }).code === 11000) throw ApiError.conflict('An inventory item with this SKU already exists'); throw error; }
}

export async function listItems(query: ListItemsQuery) {
  const { items, total } = await repo.findManyItems(query);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export function listPOs(): Promise<IPurchaseOrder[]> {
  return repo.findManyPOs();
}

export async function createPO(input: CreatePOInput, requester: AuthenticatedUser): Promise<IPurchaseOrder> {
  if (!canManageInventory(requester.role)) throw ApiError.forbidden('Insufficient role to raise a purchase order');
  for (const line of input.lines) {
    const item = await repo.findItemById(line.itemId);
    if (!item) throw ApiError.badRequest(`Inventory item ${line.itemId} not found`);
  }
  try { const po = await repo.createPO(input, requester.id); await logAudit(`Raised purchase order ${po.refId}`, 'Inventory', requester.id); return po; }
  catch (error) { if ((error as { code?: number }).code === 11000) throw ApiError.conflict('A purchase order with this reference already exists'); throw error; }
}

export async function adjustStock(id: string, input: AdjustStockInput, requester: AuthenticatedUser): Promise<IInventoryItem> {
  if (!canManageInventory(requester.role)) throw ApiError.forbidden('Insufficient role to adjust inventory stock');
  const updated = await repo.adjustStock(id, input, requester.id);
  if (!updated) {
    const item = await repo.findItemById(id);
    if (!item) throw ApiError.notFound('Inventory item not found');
    throw ApiError.conflict('This adjustment would make stock negative');
  }
  await logAudit(`Adjusted ${updated.name} stock by ${input.quantityDelta > 0 ? '+' : ''}${input.quantityDelta}`, 'Inventory', requester.id);
  return updated;
}

async function getPOOrThrow(id: string): Promise<IPurchaseOrder> {
  const po = await repo.findPOById(id);
  if (!po) throw ApiError.notFound('Purchase order not found');
  return po;
}

export async function sendPO(id: string, requester: AuthenticatedUser): Promise<IPurchaseOrder> {
  if (!canManageInventory(requester.role)) throw ApiError.forbidden('Insufficient role to send a purchase order');
  const po = await getPOOrThrow(id);
  if (!canTransitionPO(po.status as POStatus, 'Sent'))
    throw ApiError.badRequest(`Cannot move a purchase order from ${po.status} to Sent`);
  const updated = await repo.setPOStatus(id, 'Sent');
  if (!updated) throw ApiError.notFound('Purchase order not found');
  await logAudit(`Sent purchase order ${updated.refId}`, 'Inventory', requester.id);
  return updated;
}

export async function receivePO(id: string, requester: AuthenticatedUser): Promise<IPurchaseOrder> {
  if (!canManageInventory(requester.role)) throw ApiError.forbidden('Insufficient role to receive a purchase order');
  const po = await getPOOrThrow(id);
  if (!canTransitionPO(po.status as POStatus, 'Received'))
    throw ApiError.badRequest(`Cannot move a purchase order from ${po.status} to Received`);
  let updated: IPurchaseOrder;
  try { updated = await repo.receivePOAndUpdateStock(id); }
  catch (error) {
    if ((error as { code?: string }).code === 'PO_NOT_SENT')
      throw ApiError.conflict('This purchase order was already received or is no longer awaiting receipt');
    throw error;
  }
  await logAudit(`Received purchase order ${updated.refId}`, 'Inventory', requester.id);
  return updated;
}

export async function cancelPO(id: string, requester: AuthenticatedUser): Promise<IPurchaseOrder> {
  if (!canManageInventory(requester.role)) throw ApiError.forbidden('Insufficient role to cancel a purchase order');
  const po = await getPOOrThrow(id);
  if (!canTransitionPO(po.status as POStatus, 'Cancelled'))
    throw ApiError.badRequest(`Cannot move a purchase order from ${po.status} to Cancelled`);
  const updated = await repo.setPOStatus(id, 'Cancelled');
  if (!updated) throw ApiError.notFound('Purchase order not found');
  await logAudit(`Cancelled purchase order ${updated.refId}`, 'Inventory', requester.id);
  return updated;
}
