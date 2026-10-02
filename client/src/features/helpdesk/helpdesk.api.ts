import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface Ticket {
  _id: string;
  raisedBy: { _id: string; name: string; email: string; role: string } | string;
  category: string;
  subject: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'Assigned' | 'Resolved' | 'Closed';
  assignedTo?: { _id: string; name: string; refId: string } | string;
  resolutionNotes?: string;
}

export type RaiseTicketInput = Pick<Ticket, 'category' | 'subject' | 'description' | 'priority'>;
export interface TransitionTicketInput { status: Ticket['status']; assignedTo?: string; resolutionNotes?: string }

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listTickets(page = 1): Promise<Paginated<Ticket>> {
  const res = await apiClient.get<ApiSuccess<Ticket[]>>('/helpdesk', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export async function raiseTicket(input: RaiseTicketInput): Promise<Ticket> {
  const res = await apiClient.post<ApiSuccess<Ticket>>('/helpdesk', input);
  return res.data.data;
}

export async function transitionTicket(id: string, input: TransitionTicketInput): Promise<Ticket> {
  const res = await apiClient.post<ApiSuccess<Ticket>>(`/helpdesk/${id}/transition`, input);
  return res.data.data;
}
