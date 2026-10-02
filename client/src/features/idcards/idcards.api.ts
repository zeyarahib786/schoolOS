import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface IdCard {
  _id: string;
  serial: string;
  subjectType: 'Student' | 'Staff';
  subject: { _id: string; name: string; refId: string } | string | null;
  issuedDate: string;
  expiryDate: string;
  status: 'Active' | 'Lost' | 'Revoked';
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listCards(page = 1): Promise<Paginated<IdCard>> {
  const res = await apiClient.get<ApiSuccess<IdCard[]>>('/id-cards', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export interface IssueCardInput { subjectType: IdCard['subjectType']; subjectId: string; expiryDate: string }

export async function issueCard(input: IssueCardInput): Promise<IdCard> {
  const res = await apiClient.post<ApiSuccess<IdCard>>('/id-cards', input);
  return res.data.data;
}

export async function reportCardLost(id: string): Promise<IdCard> {
  const res = await apiClient.post<ApiSuccess<IdCard>>(`/id-cards/${id}/report-lost`);
  return res.data.data;
}

export async function revokeCard(id: string): Promise<IdCard> {
  const res = await apiClient.post<ApiSuccess<IdCard>>(`/id-cards/${id}/revoke`);
  return res.data.data;
}
