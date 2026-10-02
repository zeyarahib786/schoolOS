import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface AuditEntry {
  _id: string;
  action: string;
  module: string;
  performedBy: { _id: string; name: string; email: string; role: string } | string;
  severity: 'Info' | 'Warning' | 'Critical';
  createdAt: string;
}

export interface Paginated<T> { items: T[]; page: number; limit: number; total: number; totalPages: number }

export async function listAuditLog(page = 1, filters: { module?: string; severity?: AuditEntry['severity'] } = {}): Promise<Paginated<AuditEntry>> {
  const limit = 20;
  const res = await apiClient.get<ApiSuccess<AuditEntry[]>>('/audit-log', { params: { page, limit, module: filters.module || undefined, severity: filters.severity || undefined } });
  const pagination = res.data.meta?.pagination ?? { page, limit, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}
