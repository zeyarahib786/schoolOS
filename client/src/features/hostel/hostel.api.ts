import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface HostelRoom {
  _id: string;
  roomNumber: string;
  block: string;
  capacity: number;
  occupants: { _id: string; name: string; refId: string }[] | string[];
}

export interface CreateRoomInput { roomNumber: string; block: string; capacity: number }

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listRooms(page = 1): Promise<Paginated<HostelRoom>> {
  const res = await apiClient.get<ApiSuccess<HostelRoom[]>>('/hostel/rooms', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export async function createRoom(input: CreateRoomInput): Promise<HostelRoom> {
  const res = await apiClient.post<ApiSuccess<HostelRoom>>('/hostel/rooms', input);
  return res.data.data;
}

export async function allocateStudent(roomId: string, studentId: string): Promise<HostelRoom> {
  const res = await apiClient.post<ApiSuccess<HostelRoom>>(`/hostel/rooms/${roomId}/allocate`, { studentId });
  return res.data.data;
}
