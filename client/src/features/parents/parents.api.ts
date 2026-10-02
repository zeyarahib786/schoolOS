import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface GuardianProfile {
  _id: string;
  refId: string;
  name: string;
  relation: 'Parent' | 'Father' | 'Mother' | 'Guardian' | 'Other';
  phone: string;
  email: string;
  studentIds: Array<{ _id: string; refId: string; name: string; grade: string; feeStatus: string }>;
  portalStatus: 'Active' | 'Invited' | 'Suspended';
  custody: string;
  pickupAuthorized: boolean;
  financialResponsible: boolean;
  consents: { media: boolean; trips: boolean; medical: boolean };
}

export interface ParentBroadcastInput {
  audience: 'All parents' | 'By grade' | 'Single class' | 'Individual guardian';
  grade?: string;
  className?: string;
  guardianId?: string;
  channel: 'In-app + Email' | 'SMS + Email' | 'In-app only';
  subject: string;
  message: string;
}

export async function listGuardians(): Promise<GuardianProfile[]> {
  const response = await apiClient.get<ApiSuccess<GuardianProfile[]>>('/guardians', { params: { limit: 100 } });
  return response.data.data;
}
export async function setGuardianPortal(id: string, status: 'Active' | 'Suspended'): Promise<GuardianProfile> {
  const response = await apiClient.patch<ApiSuccess<GuardianProfile>>(`/guardians/${id}/portal`, { status });
  return response.data.data;
}
export async function sendParentBroadcast(input: ParentBroadcastInput): Promise<void> {
  await apiClient.post('/guardians/broadcasts', input);
}
export async function sendGuardianReply(id: string, text: string): Promise<void> {
  await apiClient.post(`/guardians/${id}/messages`, { text });
}

