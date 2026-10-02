import { apiClient } from '../../lib/api/client';

export interface ClassSection {
  _id: string;
  grade: string;
  section: string;
  className: string;
  stream: 'Foundation' | 'Primary' | 'General' | 'Commerce' | 'Science' | 'Arts';
  teacherStaffId?: { _id: string; name: string; type: string; status: string };
  representativeStudentId?: { _id: string; name: string; grade: string; status: string };
  capacity: number;
  filled: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassSectionInput {
  grade: string;
  section: string;
  stream: ClassSection['stream'];
  teacherStaffId?: string;
  capacity: number;
}

interface ApiSuccess<T> { data: T }

export async function listClasses(): Promise<ClassSection[]> {
  const response = await apiClient.get<ApiSuccess<ClassSection[]>>('/classes', { params: { page: 1, limit: 100 } });
  return response.data.data;
}

export async function createClass(input: CreateClassSectionInput): Promise<ClassSection> {
  const response = await apiClient.post<ApiSuccess<ClassSection>>('/classes', input);
  return response.data.data;
}
