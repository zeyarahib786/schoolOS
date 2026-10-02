import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface StaffMember {
  _id: string;
  refId: string;
  name: string;
  designation: string;
  department: string;
  type: 'Teaching' | 'Non-Teaching';
  status: 'Active' | 'Onboarding' | 'On Leave' | 'Inactive';
  email: string;
  phone: string;
  joinedDate: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type CreateStaffInput = Omit<StaffMember, '_id' | 'status'> & { status?: StaffMember['status'] };
export type UpdateStaffInput = Partial<CreateStaffInput>;

export async function listStaff(page = 1, search = '', options: { limit?: number; status?: StaffMember['status'] } = {}): Promise<Paginated<StaffMember>> {
  const limit = options.limit ?? 20;
  const res = await apiClient.get<ApiSuccess<StaffMember[]>>('/staff', {
    params: { page, limit, search: search || undefined, status: options.status },
  });
  const pagination = res.data.meta?.pagination ?? { page, limit, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export async function createStaff(input: CreateStaffInput): Promise<StaffMember> {
  const res = await apiClient.post<ApiSuccess<StaffMember>>('/staff', input);
  return res.data.data;
}

export async function updateStaff(id: string, input: UpdateStaffInput): Promise<StaffMember> {
  const res = await apiClient.patch<ApiSuccess<StaffMember>>(`/staff/${id}`, input);
  return res.data.data;
}

export async function deleteStaff(id: string): Promise<void> {
  await apiClient.delete(`/staff/${id}`);
}
