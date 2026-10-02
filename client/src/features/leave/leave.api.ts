import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface LeaveRequest {
  _id: string;
  staff: { _id: string; name: string; refId: string; department: string; annualLeaveRemaining: number } | string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Denied';
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RequestLeaveInput { fromDate: string; toDate: string; reason: string }
export type LeaveDecision = 'Approved' | 'Denied';

export async function listLeave(page = 1): Promise<Paginated<LeaveRequest>> {
  const res = await apiClient.get<ApiSuccess<LeaveRequest[]>>('/leave', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export async function requestLeave(input: RequestLeaveInput): Promise<LeaveRequest> {
  const res = await apiClient.post<ApiSuccess<LeaveRequest>>('/leave', input);
  return res.data.data;
}

export async function decideLeave(id: string, decision: LeaveDecision): Promise<LeaveRequest> {
  const res = await apiClient.post<ApiSuccess<LeaveRequest>>(`/leave/${id}/decide`, { decision });
  return res.data.data;
}
