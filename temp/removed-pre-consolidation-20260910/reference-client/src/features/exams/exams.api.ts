import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface ExamResult {
  _id: string;
  exam: string;
  student: { _id: string; name: string; refId: string; grade: string } | string;
  scores: { subject: string; marks: number }[];
  averagePercent: number;
  grade: string;
  passing: boolean;
}
export interface Exam { _id:string; name:string; term:string; subjects:string[]; maxMarks:number; passMark:number; locked:boolean }
export interface CreateExamInput { name:string; term:string; subjects:string[]; maxMarks:number; passMark:number }
export interface RecordResultInput { examId:string; studentId:string; scores:Array<{subject:string;marks:number}> }
export interface ExamSummary { exam:{id:string;name:string;term:string;subjects:string[]};studentCount:number;classAverage:number;passCount:number;passRate:number }

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listResults(page = 1): Promise<Paginated<ExamResult>> {
  const res = await apiClient.get<ApiSuccess<ExamResult[]>>('/exams/results', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}
export async function listExams():Promise<Exam[]>{const res=await apiClient.get<ApiSuccess<Exam[]>>('/exams',{params:{page:1,limit:100}});return res.data.data;}
export async function createExam(input:CreateExamInput):Promise<Exam>{const res=await apiClient.post<ApiSuccess<Exam>>('/exams',input);return res.data.data;}
export async function recordResult(input:RecordResultInput):Promise<ExamResult>{const res=await apiClient.post<ApiSuccess<ExamResult>>('/exams/results',input);return res.data.data;}
export async function getExamSummary(id:string):Promise<ExamSummary>{const res=await apiClient.get<ApiSuccess<ExamSummary>>(`/exams/${id}/summary`);return res.data.data;}
export async function addExamSubject(id:string,subject:string):Promise<Exam>{const res=await apiClient.post<ApiSuccess<Exam>>(`/exams/${id}/subjects`,{subject});return res.data.data;}
export async function removeExamSubject(id:string,subject:string):Promise<Exam>{const res=await apiClient.delete<ApiSuccess<Exam>>(`/exams/${id}/subjects/${encodeURIComponent(subject)}`);return res.data.data;}
