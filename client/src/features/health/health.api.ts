import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface ClinicVisit {
  _id: string;
  student: { _id: string; name: string; refId: string; grade: string } | string;
  reason: string;
  treatment: string;
  outcome: 'Returned to class' | 'Sent home' | 'Referred to hospital';
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface CreateVisitInput { studentId:string; reason:string; treatment:string; outcome:ClinicVisit['outcome'] }

export async function listVisits(page = 1): Promise<Paginated<ClinicVisit>> {
  const res = await apiClient.get<ApiSuccess<ClinicVisit[]>>('/health-records', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}
export async function recordVisit(input:CreateVisitInput):Promise<ClinicVisit>{const res=await apiClient.post<ApiSuccess<ClinicVisit>>('/health-records',input);return res.data.data;}
