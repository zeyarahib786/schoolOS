import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface SchoolDocument {
  _id: string;
  code: string;
  title: string;
  category: 'Policy' | 'Form' | 'Circular' | 'Guideline';
  version: number;
  description: string;
  isCurrent: boolean;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listDocuments(page = 1, includeSuperseded = false): Promise<Paginated<SchoolDocument>> {
  const res = await apiClient.get<ApiSuccess<SchoolDocument[]>>('/documents', { params: { page, limit: 20, includeSuperseded: includeSuperseded || undefined } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export type PublishDocumentInput = Pick<SchoolDocument, 'code' | 'title' | 'category' | 'description'>;

export async function publishDocument(input: PublishDocumentInput): Promise<SchoolDocument> {
  const res = await apiClient.post<ApiSuccess<SchoolDocument>>('/documents', input);
  return res.data.data;
}
