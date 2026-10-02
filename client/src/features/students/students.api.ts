import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface Student {
  _id: string;
  refId: string;
  name: string;
  grade: string;
  gender: 'Male' | 'Female';
  roll: string;
  guardianName: string;
  phone: string;
  dateOfBirth?: string;
  nationality?: string;
  guardianRelationship?: 'Father' | 'Mother' | 'Guardian' | 'Other';
  guardianEmail?: string;
  emergencyContact?: string;
  preferredLanguage?: string;
  address?: string;
  previousSchool?: string;
  previousGrade?: string;
  languages?: string;
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-' | 'Unknown';
  allergies?: string;
  medicalNotes?: string;
  transportRequirement?: 'No' | 'One-way' | 'Two-way';
  feeStatus: 'Paid' | 'Pending' | 'Overdue';
  attendancePct: number;
  gpa: number;
  status: 'Active' | 'Inactive' | 'Alumni';
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listStudents(
  page = 1,
  search = '',
  options: { limit?: number; grade?: string; status?: Student['status'] } = {},
): Promise<Paginated<Student>> {
  const limit = options.limit ?? 20;
  const res = await apiClient.get<ApiSuccess<Student[]>>('/students', {
    params: { page, limit, search: search || undefined, grade: options.grade, status: options.status },
  });
  const pagination = res.data.meta?.pagination ?? { page, limit, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export type CreateStudentInput = Omit<Student, '_id'>;

export async function createStudent(input: CreateStudentInput): Promise<Student> {
  const res = await apiClient.post<ApiSuccess<Student>>('/students', input);
  return res.data.data;
}

export type UpdateStudentInput = Partial<CreateStudentInput>;

export async function updateStudent(id: string, input: UpdateStudentInput): Promise<Student> {
  const res = await apiClient.patch<ApiSuccess<Student>>(`/students/${id}`, input);
  return res.data.data;
}

export async function deleteStudent(id: string): Promise<void> {
  await apiClient.delete(`/students/${id}`);
}
