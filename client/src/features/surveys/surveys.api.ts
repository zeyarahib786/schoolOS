import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface Survey {
  _id: string;
  title: string;
  description: string;
  questions: { questionText: string; options: string[] }[];
  status: 'Draft' | 'Scheduled' | 'Active' | 'Closed';
  scheduledAt?: string;
}

export interface CreateSurveyInput {
  title: string;
  description: string;
  questions: Survey['questions'];
  scheduledAt?: string;
}

export interface SurveyResults {
  title: string;
  totalRespondents: number;
  questions: { questionText: string; options: { option: string; count: number }[] }[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listSurveys(page = 1): Promise<Paginated<Survey>> {
  const res = await apiClient.get<ApiSuccess<Survey[]>>('/surveys', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export async function createSurvey(input: CreateSurveyInput): Promise<Survey> {
  const res = await apiClient.post<ApiSuccess<Survey>>('/surveys', input);
  return res.data.data;
}

export async function activateSurvey(id: string): Promise<Survey> {
  const res = await apiClient.post<ApiSuccess<Survey>>(`/surveys/${id}/activate`);
  return res.data.data;
}

export async function closeSurvey(id: string): Promise<Survey> {
  const res = await apiClient.post<ApiSuccess<Survey>>(`/surveys/${id}/close`);
  return res.data.data;
}

export async function respondToSurvey(id: string, answers: { questionIndex: number; selectedOption: string }[]): Promise<void> {
  await apiClient.post(`/surveys/${id}/respond`, { answers });
}

export async function getSurveyResults(id: string): Promise<SurveyResults> {
  const res = await apiClient.get<ApiSuccess<SurveyResults>>(`/surveys/${id}/results`);
  return res.data.data;
}
