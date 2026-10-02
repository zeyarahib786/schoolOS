import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface Invoice {
  _id: string;
  refId: string;
  student: { _id: string; name: string; refId: string; grade: string } | string;
  term: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'Pending' | 'Paid' | 'Overdue';
  paymentMethod?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateInvoiceInput {
  refId: string;
  studentId: string;
  term: string;
  amount: number;
  currency?: string;
  dueDate: string;
}

export type PaymentMethod = 'Card' | 'Bank transfer' | 'Cash' | 'Cheque' | 'Online portal';

export async function listInvoices(page = 1): Promise<Paginated<Invoice>> {
  const res = await apiClient.get<ApiSuccess<Invoice[]>>('/fees', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  const res = await apiClient.post<ApiSuccess<Invoice>>('/fees', input);
  return res.data.data;
}

export async function recordPayment(id: string, paymentMethod: PaymentMethod): Promise<Invoice> {
  const res = await apiClient.post<ApiSuccess<Invoice>>(`/fees/${id}/pay`, { paymentMethod });
  return res.data.data;
}
