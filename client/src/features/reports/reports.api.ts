import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface StatusCount {
  _id: string;
  count: number;
}

export interface ReportsOverview {
  students: { byStatus: StatusCount[]; byGrade: StatusCount[]; averages: { avgGpa: number; avgAttendancePct: number } | null };
  staff: { byType: StatusCount[]; count: number };
  applications: { count: number };
  exams: { byGrade: StatusCount[]; resultCount: number };
  fees: {
    currency: string;
    byStatus: { _id: string; count: number; totalAmount: number; totalPaid: number }[];
    billed: number;
    collected: number;
    invoiceCount: number;
    paidCount: number;
    dueCount: number;
    overdueCount: number;
  };
  helpdesk: { byStatus: StatusCount[] };
  attendance: { monthly: { month: string; attended: number; eligible: number; rate: number | null }[] };
}

export async function getOverview(): Promise<ReportsOverview> {
  const res = await apiClient.get<ApiSuccess<ReportsOverview>>('/reports/overview');
  return res.data.data;
}
