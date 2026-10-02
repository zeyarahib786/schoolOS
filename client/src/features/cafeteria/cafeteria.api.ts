import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface CafeteriaWallet {
  _id: string;
  student: { _id: string; name: string; refId: string } | string;
  balance: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listWallets(page = 1): Promise<Paginated<CafeteriaWallet>> {
  const res = await apiClient.get<ApiSuccess<CafeteriaWallet[]>>('/cafeteria/wallets', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export interface WalletTransactionInput { studentId: string; amount: number; description: string }

export async function topUpWallet(input: WalletTransactionInput): Promise<CafeteriaWallet> {
  const res = await apiClient.post<ApiSuccess<CafeteriaWallet>>('/cafeteria/wallets/top-up', input);
  return res.data.data;
}

export async function recordPurchase(input: WalletTransactionInput): Promise<CafeteriaWallet> {
  const res = await apiClient.post<ApiSuccess<CafeteriaWallet>>('/cafeteria/wallets/purchase', input);
  return res.data.data;
}
