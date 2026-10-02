import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface Message {
  _id: string;
  sender: { _id: string; name: string; email: string } | string;
  recipient: { _id: string; name: string; email: string } | string;
  subject: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface SendMessageInput{recipientEmail:string;subject:string;body:string}

export async function listMessages(page = 1): Promise<Paginated<Message>> {
  const res = await apiClient.get<ApiSuccess<Message[]>>('/messages', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}
export async function sendMessage(input:SendMessageInput):Promise<Message>{const res=await apiClient.post<ApiSuccess<Message>>('/messages',input);return res.data.data;}
export async function markRead(id:string):Promise<Message>{const res=await apiClient.post<ApiSuccess<Message>>(`/messages/${id}/read`);return res.data.data;}
