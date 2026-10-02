import { apiClient } from '../../lib/api/client';

export type CrmStage = 'New' | 'Contacted' | 'Toured' | 'Application' | 'Won';
export interface CrmActivity { action: string; occurredAt: string }
export interface CrmLead {
  _id: string; name: string; grade: string; stage: CrmStage; source: string;
  phone?: string; guardian?: string; guardianEmail?: string; owner: string;
  temperature: 'Hot' | 'Warm' | 'Cold'; followUpDate?: string; followUpType?: string;
  archived: boolean; archiveReason?: string; lastActivityAt: string;
  activityLog: CrmActivity[]; createdAt: string; updatedAt: string;
}
export interface CreateCrmLeadInput {
  name: string; grade: string; source?: string; phone?: string; guardian?: string;
  guardianEmail?: string; owner?: string; temperature?: CrmLead['temperature'];
  followUpDate?: string; notes?: string;
}
interface ApiSuccess<T> { data: T }
export async function listCrmLeads(): Promise<CrmLead[]> {
  const response = await apiClient.get<ApiSuccess<CrmLead[]>>('/crm', { params: { page: 1, limit: 100 } });
  return response.data.data;
}
export async function createCrmLead(input: CreateCrmLeadInput): Promise<CrmLead> {
  const response = await apiClient.post<ApiSuccess<CrmLead>>('/crm', input);
  return response.data.data;
}
