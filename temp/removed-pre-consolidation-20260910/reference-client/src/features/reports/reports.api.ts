import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface StatusCount {
  _id: string;
  count: number;
}

export interface ReportsOverview {
  students: { byStatus: StatusCount[]; averages: { avgGpa: number; avgAttendancePct: number } | null };
  staff: { byType: StatusCount[] };
  fees: { byStatus: { _id: string; count: number; totalAmount: number }[] };
  helpdesk: { byStatus: StatusCount[] };
}

export async function getOverview(): Promise<ReportsOverview> {
  const res = await apiClient.get<ApiSuccess<ReportsOverview>>('/reports/overview');
  return res.data.data;
}
