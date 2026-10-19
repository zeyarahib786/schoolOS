import { Ticket } from '../../models/Ticket';
import { z } from 'zod';
import { replyTicketSchema } from './helpdesk.validation';
import { ApiError } from '../../utils/ApiError';
import { ITicket } from '../../models/Ticket';
import * as repo from './helpdesk.repository';
import { ListTicketsQuery, RaiseTicketInput, TransitionTicketInput } from './helpdesk.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeTicketFilter, canResolveTickets } from './helpdesk.ownership';
import { canTransition, TicketStatus } from './ticket.state-machine';
import { logAudit } from '../audit/audit.service';

export async function listTickets(query: ListTicketsQuery, requester: AuthenticatedUser) {
  const { items, total } = await repo.findMany(query, (base) => scopeTicketFilter(base, requester));
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

/** Ticket creation is open to every authenticated role - no canCreate check at all, unlike every
 * prior module. Anyone in the school community can raise an issue. */
export async function raiseTicket(input: RaiseTicketInput, requester: AuthenticatedUser): Promise<ITicket> {
  const ticket = await repo.create(requester.id, input);
  await logAudit(`Raised helpdesk ticket ${ticket.subject}`, 'Helpdesk', requester.id);
  return ticket;
}

/**
 * The actual state-machine enforcement: a transition request is rejected with 400 (not silently
 * applied, and not a generic 403) if it doesn't follow the allowed graph in
 * ticket.state-machine.ts - regardless of the requester's role. Role gating (canResolveTickets)
 * and state-machine validity are two independent checks; both must pass.
 */
export async function transitionTicket(
  id: string,
  input: TransitionTicketInput,
  requester: AuthenticatedUser,
): Promise<ITicket> {
  if (!canResolveTickets(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may update a ticket');

  const ticket = await repo.findById(id);
  if (!ticket) throw ApiError.notFound('Ticket not found');

  const from = ticket.status as TicketStatus;
  const to = input.status;
  if (!canTransition(from, to)) {
    throw ApiError.badRequest(`Cannot move a ticket from ${from} to ${to} - see the allowed transitions for ${from}`);
  }

  if (to === 'Assigned' && !input.assignedTo && !ticket.assignedTo) {
    throw ApiError.badRequest('assignedTo is required when moving a ticket to Assigned');
  }
  if (to === 'Assigned' && input.assignedTo) {
    const staff = await repo.findStaffById(input.assignedTo);
    if (!staff) throw ApiError.badRequest('Assigned staff member was not found');
    if (staff.status !== 'Active') throw ApiError.conflict('A ticket can only be assigned to active staff');
  }

  if (to === 'Resolved' && !(input.resolutionNotes || '').trim())
    throw ApiError.badRequest('Meaningful resolution notes are required');
  const updated = await repo.applyTransition(id, from, input, requester.id);
  if (!updated)
    throw ApiError.conflict('This ticket changed before the update could be applied; refresh and try again');
  await logAudit(`Moved helpdesk ticket ${ticket.subject} from ${from} to ${to}`, 'Helpdesk', requester.id);
  return updated;
}

export async function replyTicket(
  id: string,
  input: z.infer<typeof replyTicketSchema>['body'],
  requester: AuthenticatedUser,
) {
  const ticket = await Ticket.findOne(scopeTicketFilter({ _id: id }, requester));
  if (!ticket) throw ApiError.notFound('Ticket not found');
  const saved = await Ticket.findOneAndUpdate(
    { _id: id, updatedAt: new Date(input.expectedUpdatedAt), status: { $ne: 'Closed' } },
    { $push: { replies: { at: new Date(), by: requester.id, name: requester.role, message: input.message } } },
    { new: true, runValidators: true },
  );
  if (!saved) throw ApiError.conflict('Ticket changed or closed; reload before replying');
  await logAudit('Added reply to helpdesk ticket ' + id, 'Helpdesk', requester.id);
  return saved;
}
