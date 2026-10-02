import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface MeetingSlot {
  _id: string;
  teacher: { _id: string; name: string; refId: string; department: string } | string;
  date: string;
  startTime: string;
  bookedBy?: string | null;
  bookedForStudent?: { _id: string; name: string; refId: string } | string | null;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface CreateSlotInput { teacherStaffId:string; date:string; startTime:string }

export async function listSlots(page = 1): Promise<Paginated<MeetingSlot>> {
  const res = await apiClient.get<ApiSuccess<MeetingSlot[]>>('/meetings', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}
export async function createSlot(input:CreateSlotInput):Promise<MeetingSlot>{const res=await apiClient.post<ApiSuccess<MeetingSlot>>('/meetings',input);return res.data.data;}
export async function bookSlot(id:string,studentId:string):Promise<MeetingSlot>{const res=await apiClient.post<ApiSuccess<MeetingSlot>>(`/meetings/${id}/book`,{studentId});return res.data.data;}
