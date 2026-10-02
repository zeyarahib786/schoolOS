import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface SchoolDocument {
  _id: string;
  code: string;
  title: string;
  category: 'Policy' | 'Form' | 'Circular' | 'Guideline';
  version: number;
  description: string;
  isCurrent: boolean;
  fileId?: string;
  filename?: string;
  size?: number;
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

export async function publishDocument(input: PublishDocumentInput, file?: File): Promise<SchoolDocument> {
  const res = file
    ? await apiClient.post<ApiSuccess<SchoolDocument>>('/documents/file', file, {
      headers: {
        'Content-Type': 'application/pdf',
        'X-File-Name': encodeURIComponent(file.name),
        'X-Document-Code': encodeURIComponent(input.code),
        'X-Document-Title': encodeURIComponent(input.title),
        'X-Document-Category': encodeURIComponent(input.category),
        'X-Document-Description': encodeURIComponent(input.description),
      },
    })
    : await apiClient.post<ApiSuccess<SchoolDocument>>('/documents', input);
  return res.data.data;
}

export async function downloadDocument(document: SchoolDocument): Promise<void> {
  const res = await apiClient.get<Blob>(`/documents/${document._id}/file`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = document.filename || `${document.code}.pdf`;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
