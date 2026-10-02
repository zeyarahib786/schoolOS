import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface Assignment {
  _id: string;
  title: string;
  subject: string;
  grade: string;
  dueDate: string;
  maxScore: number;
  description: string;
}

export interface Submission {
  _id: string;
  assignment: { _id: string; title: string; subject: string; dueDate: string; maxScore: number } | string;
  student: { _id: string; name: string; refId: string } | string;
  isLate: boolean;
  score?: number;
  status: 'Submitted' | 'Graded';
  content: string;
  feedback?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listAssignments(page = 1): Promise<Paginated<Assignment>> {
  const res = await apiClient.get<ApiSuccess<Assignment[]>>('/lms/assignments', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export async function listSubmissions(): Promise<Submission[]> {
  const res = await apiClient.get<ApiSuccess<Submission[]>>('/lms/submissions');
  return res.data.data;
}

export interface CreateAssignmentInput { title: string; description: string; subject: string; grade: string; dueDate: string; maxScore: number }

export async function createAssignment(input: CreateAssignmentInput): Promise<Assignment> {
  const res = await apiClient.post<ApiSuccess<Assignment>>('/lms/assignments', input);
  return res.data.data;
}

export async function submitAssignment(id: string, content: string): Promise<Submission> {
  const res = await apiClient.post<ApiSuccess<Submission>>(`/lms/assignments/${id}/submit`, { content });
  return res.data.data;
}

export async function gradeSubmission(id: string, score: number, feedback?: string): Promise<Submission> {
  const res = await apiClient.post<ApiSuccess<Submission>>(`/lms/submissions/${id}/grade`, { score, feedback });
  return res.data.data;
}
