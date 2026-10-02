import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface VisitorLog {
  _id: string;
  visitorName: string;
  purpose: string;
  hostName: string;
  checkedInAt: string;
  checkedOutAt?: string;
  status: 'CheckedIn' | 'CheckedOut';
}

export interface CheckInInput { visitorName: string; purpose: string; hostName: string }

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listVisitors(page = 1): Promise<Paginated<VisitorLog>> {
  const res = await apiClient.get<ApiSuccess<VisitorLog[]>>('/visitors', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export async function checkInVisitor(input: CheckInInput): Promise<VisitorLog> {
  const res = await apiClient.post<ApiSuccess<VisitorLog>>('/visitors', input);
  return res.data.data;
}

export async function checkOutVisitor(id: string): Promise<VisitorLog> {
  const res = await apiClient.post<ApiSuccess<VisitorLog>>(`/visitors/${id}/checkout`);
  return res.data.data;
}
