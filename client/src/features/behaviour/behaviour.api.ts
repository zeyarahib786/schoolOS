import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface BehaviourIncident {
  _id: string;
  student: { _id: string; name: string; refId: string; grade: string } | string;
  category: string;
  description: string;
  severity: 'Minor' | 'Moderate' | 'Serious';
  actionTaken?: string;
  createdAt: string;
}
export interface CreateIncidentInput { studentId:string; category:string; description:string; severity:BehaviourIncident['severity']; actionTaken?:string }

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listIncidents(page = 1): Promise<Paginated<BehaviourIncident>> {
  const res = await apiClient.get<ApiSuccess<BehaviourIncident[]>>('/behaviour', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}
export async function createIncident(input:CreateIncidentInput):Promise<BehaviourIncident>{const res=await apiClient.post<ApiSuccess<BehaviourIncident>>('/behaviour',input);return res.data.data;}
