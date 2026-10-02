import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface InventoryItem {
  _id: string;
  name: string;
  sku: string;
  category: string;
  quantityOnHand: number;
  reorderLevel: number;
  unitCost: number;
}
export type CreateInventoryItemInput = Omit<InventoryItem, '_id'>;
export interface PurchaseOrder { _id: string; refId: string; supplier: string; lines: Array<{ item: { _id: string; name: string; sku: string } | string; quantity: number; unitCost: number }>; status: 'Draft' | 'Sent' | 'Received' | 'Cancelled'; receivedDate?: string }
export interface CreatePurchaseOrderInput { refId: string; supplier: string; lines: Array<{ itemId: string; quantity: number; unitCost: number }> }

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listItems(page = 1): Promise<Paginated<InventoryItem>> {
  const res = await apiClient.get<ApiSuccess<InventoryItem[]>>('/inventory/items', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}
export async function createItem(input: CreateInventoryItemInput): Promise<InventoryItem> { const res = await apiClient.post<ApiSuccess<InventoryItem>>('/inventory/items', input); return res.data.data; }
export async function listPurchaseOrders(): Promise<PurchaseOrder[]> { const res = await apiClient.get<ApiSuccess<PurchaseOrder[]>>('/inventory/purchase-orders'); return res.data.data; }
export async function createPurchaseOrder(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> { const res = await apiClient.post<ApiSuccess<PurchaseOrder>>('/inventory/purchase-orders', input); return res.data.data; }
export async function sendPurchaseOrder(id: string): Promise<PurchaseOrder> { const res = await apiClient.post<ApiSuccess<PurchaseOrder>>(`/inventory/purchase-orders/${id}/send`); return res.data.data; }
export async function receivePurchaseOrder(id: string): Promise<PurchaseOrder> { const res = await apiClient.post<ApiSuccess<PurchaseOrder>>(`/inventory/purchase-orders/${id}/receive`); return res.data.data; }
export async function cancelPurchaseOrder(id: string): Promise<PurchaseOrder> { const res = await apiClient.post<ApiSuccess<PurchaseOrder>>(`/inventory/purchase-orders/${id}/cancel`); return res.data.data; }
