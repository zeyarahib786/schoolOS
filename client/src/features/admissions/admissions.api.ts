import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface AdmissionApplication {
  _id: string;
  applicantName: string;
  gradeAppliedFor: string;
  guardianName: string;
  status: 'Applied' | 'Shortlisted' | 'Interviewed' | 'Accepted' | 'Enrolled' | 'Rejected';
  createdAt: string;
}

export interface CreateAdmissionInput {
  applicantName: string;
  gradeAppliedFor: string;
  gender: 'Male' | 'Female';
  guardianName: string;
  phone: string;
  notes?: string;
}

export type AdmissionTransitionStatus = 'Shortlisted' | 'Interviewed' | 'Accepted' | 'Rejected';

export interface EnrollAdmissionInput {
  refId: string;
  roll: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listApplications(page = 1): Promise<Paginated<AdmissionApplication>> {
  const res = await apiClient.get<ApiSuccess<AdmissionApplication[]>>('/admissions', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export async function createApplication(input: CreateAdmissionInput): Promise<AdmissionApplication> {
  const res = await apiClient.post<ApiSuccess<AdmissionApplication>>('/admissions', input);
  return res.data.data;
}

export async function transitionApplication(
  id: string,
  status: AdmissionTransitionStatus,
): Promise<AdmissionApplication> {
  const res = await apiClient.post<ApiSuccess<AdmissionApplication>>(`/admissions/${id}/transition`, { status });
  return res.data.data;
}

export async function enrollApplication(id: string, input: EnrollAdmissionInput): Promise<AdmissionApplication> {
  const res = await apiClient.post<ApiSuccess<AdmissionApplication>>(`/admissions/${id}/enroll`, input);
  return res.data.data;
}
