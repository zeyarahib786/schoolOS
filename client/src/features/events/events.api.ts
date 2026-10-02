import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface EventItem {
  _id: string;
  title: string;
  description: string;
  date: string;
  audience: 'All' | 'Students' | 'Staff' | 'Parents';
  booking?: { _id: string; facility: string; startTime: string; endTime: string } | string;
}

export interface CreateEventInput {
  title: string;
  description: string;
  date: string;
  audience: EventItem['audience'];
  venue?: { facilityId: string; startTime: string; endTime: string };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listEvents(page = 1): Promise<Paginated<EventItem>> {
  const res = await apiClient.get<ApiSuccess<EventItem[]>>('/events', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export async function createEvent(input: CreateEventInput): Promise<EventItem> {
  const res = await apiClient.post<ApiSuccess<EventItem>>('/events', input);
  return res.data.data;
}
