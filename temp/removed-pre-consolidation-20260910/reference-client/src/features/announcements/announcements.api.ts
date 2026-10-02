import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface Announcement {
  _id: string;
  title: string;
  body: string;
  audience: 'All' | 'Staff' | 'Parents' | 'Students';
  pinned: boolean;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export type CreateAnnouncementInput=Pick<Announcement,'title'|'body'|'audience'|'pinned'>;

export async function listAnnouncements(page = 1): Promise<Paginated<Announcement>> {
  const res = await apiClient.get<ApiSuccess<Announcement[]>>('/announcements', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}
export async function publishAnnouncement(input:CreateAnnouncementInput):Promise<Announcement>{const res=await apiClient.post<ApiSuccess<Announcement>>('/announcements',input);return res.data.data;}
