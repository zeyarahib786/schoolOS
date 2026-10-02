import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface AttendanceRecord {
  _id: string;
  student: { _id: string; name: string; refId: string; grade: string } | string;
  date: string;
  session: 'AM' | 'PM';
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  notes?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MarkAttendanceInput {
  date: string;
  session: 'AM' | 'PM';
  entries: Array<{
    studentId: string;
    status: AttendanceRecord['status'];
    notes?: string;
  }>;
}

export async function listAttendance(page = 1): Promise<Paginated<AttendanceRecord>> {
  const res = await apiClient.get<ApiSuccess<AttendanceRecord[]>>('/attendance', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export async function markAttendance(input: MarkAttendanceInput): Promise<{ markedCount: number }> {
  const res = await apiClient.post<ApiSuccess<{ markedCount: number }>>('/attendance/mark', input);
  return res.data.data;
}

export async function saveRegister(input: MarkAttendanceInput): Promise<{ markedCount: number; updatedCount: number; createdCount: number }> {
  const res = await apiClient.put<ApiSuccess<{ markedCount: number; updatedCount: number; createdCount: number }>>('/attendance/mark', input);
  return res.data.data;
}
