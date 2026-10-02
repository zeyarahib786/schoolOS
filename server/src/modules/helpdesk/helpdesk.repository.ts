import { FilterQuery } from 'mongoose';
import { Ticket, ITicket } from '../../models/Ticket';
import { Staff } from '../../models/Staff';
import { ListTicketsQuery, RaiseTicketInput, TransitionTicketInput } from './helpdesk.validation';
import { TicketStatus } from './ticket.state-machine';

export async function findMany(
  query: ListTicketsQuery,
  applyOwnershipScope: (base: FilterQuery<ITicket>) => FilterQuery<ITicket>,
): Promise<{ items: ITicket[]; total: number }> {
  let filter: FilterQuery<ITicket> = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  filter = applyOwnershipScope(filter);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Ticket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('raisedBy', 'name email role')
      .populate('assignedTo', 'name refId'),
    Ticket.countDocuments(filter),
  ]);
  return { items, total };
}

export function findById(id: string): Promise<ITicket | null> {
  return Ticket.findById(id);
}

export function findStaffById(id: string) {
  return Staff.findById(id);
}

export function create(raisedBy: string, input: RaiseTicketInput): Promise<ITicket> {
  return Ticket.create({ raisedBy, ...input });
}

export function applyTransition(id: string, from: TicketStatus, input: TransitionTicketInput): Promise<ITicket | null> {
  return Ticket.findOneAndUpdate({ _id: id, status: from }, input, { new: true, runValidators: true });
}
