import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface ExpenseClaim {
  _id: string;
  staff: { _id: string; name: string; refId: string; designation: string } | string;
  category: string;
  amount: number;
  description: string;
  expenseDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewNotes?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SubmitClaimInput { category: string; amount: number; description: string; expenseDate: string }
export type ClaimDecision = 'Approved' | 'Rejected';

export async function listClaims(page = 1): Promise<Paginated<ExpenseClaim>> {
  const res = await apiClient.get<ApiSuccess<ExpenseClaim[]>>('/expenses', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export async function submitClaim(input: SubmitClaimInput): Promise<ExpenseClaim> {
  const res = await apiClient.post<ApiSuccess<ExpenseClaim>>('/expenses', input);
  return res.data.data;
}

export async function reviewClaim(id: string, status: ClaimDecision, reviewNotes?: string): Promise<ExpenseClaim> {
  const res = await apiClient.post<ApiSuccess<ExpenseClaim>>(`/expenses/${id}/review`, { status, reviewNotes });
  return res.data.data;
}
