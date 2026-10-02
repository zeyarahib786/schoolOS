import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface CurriculumUnit {
  _id: string;
  subject: string;
  term: string;
  title: string;
  outcomes: string;
  sequenceOrder: number;
}

export type SaveCurriculumUnitInput = Omit<CurriculumUnit, '_id'>;

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listUnits(page = 1, search = ''): Promise<Paginated<CurriculumUnit>> {
  const res = await apiClient.get<ApiSuccess<CurriculumUnit[]>>('/curriculum', {
    params: { page, limit: 20, search: search || undefined },
  });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export async function createUnit(input: SaveCurriculumUnitInput): Promise<CurriculumUnit> {
  const res = await apiClient.post<ApiSuccess<CurriculumUnit>>('/curriculum', input);
  return res.data.data;
}

export async function updateUnit(id: string, input: SaveCurriculumUnitInput): Promise<CurriculumUnit> {
  const res = await apiClient.patch<ApiSuccess<CurriculumUnit>>(`/curriculum/${id}`, input);
  return res.data.data;
}

export async function deleteUnit(id: string): Promise<void> {
  await apiClient.delete(`/curriculum/${id}`);
}
