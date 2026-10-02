import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface SchoolSettings {
  schoolName: string;
  academicYear: string;
  timezone: string;
  currency: string;
  defaultAnnualLeave: number;
}

export async function getSettings(): Promise<SchoolSettings> {
  const res = await apiClient.get<ApiSuccess<SchoolSettings>>('/settings');
  return res.data.data;
}

export async function updateSettings(input: SchoolSettings): Promise<SchoolSettings> {
  const res = await apiClient.put<ApiSuccess<SchoolSettings>>('/settings', input);
  return res.data.data;
}
