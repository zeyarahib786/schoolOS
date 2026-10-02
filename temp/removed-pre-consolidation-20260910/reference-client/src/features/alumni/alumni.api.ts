import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface AlumniProfile {
  _id: string;
  student: { _id: string; name: string; refId: string; grade: string } | string;
  graduationYear: number;
  currentEmployer?: string;
  contactEmail?: string;
}

export interface GraduateInput { studentId: string; graduationYear: number; currentEmployer?: string; contactEmail?: string; notes?: string }

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listAlumni(page = 1): Promise<Paginated<AlumniProfile>> {
  const res = await apiClient.get<ApiSuccess<AlumniProfile[]>>('/alumni', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export async function graduateStudent(input: GraduateInput): Promise<AlumniProfile> {
  const res = await apiClient.post<ApiSuccess<AlumniProfile>>('/alumni/graduate', input);
  return res.data.data;
}
