import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface Payslip {
  _id: string;
  staff: { _id: string; name: string; refId: string; designation: string } | string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  status: 'Draft' | 'Processed' | 'Paid';
  paidDate?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listPayslips(page = 1): Promise<Paginated<Payslip>> {
  const res = await apiClient.get<ApiSuccess<Payslip[]>>('/payroll', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export interface GeneratePayslipInput { staffId: string; month: string; basicSalary: number; allowances: number; deductions: number }

export async function generatePayslip(input: GeneratePayslipInput): Promise<Payslip> {
  const res = await apiClient.post<ApiSuccess<Payslip>>('/payroll', input);
  return res.data.data;
}

export async function markPayslipPaid(id: string): Promise<Payslip> {
  const res = await apiClient.post<ApiSuccess<Payslip>>(`/payroll/${id}/pay`);
  return res.data.data;
}
