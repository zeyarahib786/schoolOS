import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface Certificate {
  _id: string;
  certNumber: string;
  student: { _id: string; name: string; refId: string; grade: string } | string;
  type: 'Bonafide' | 'Transfer' | 'Character' | 'Study';
  purpose?: string;
  issuedDate: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listCertificates(page = 1): Promise<Paginated<Certificate>> {
  const res = await apiClient.get<ApiSuccess<Certificate[]>>('/certificates', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export interface IssueCertificateInput { studentId: string; type: Certificate['type']; purpose?: string }

export async function issueCertificate(input: IssueCertificateInput): Promise<Certificate> {
  const res = await apiClient.post<ApiSuccess<Certificate>>('/certificates', input);
  return res.data.data;
}
