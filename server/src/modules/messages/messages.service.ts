import { ApiError } from '../../utils/ApiError';
import { IMessage } from '../../models/Message';
import * as repo from './messages.repository';
import { ListMessagesQuery, SendMessageInput } from './messages.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeMessageFilter } from './messages.ownership';

export async function listMessages(query: ListMessagesQuery, requester: AuthenticatedUser) {
  const { items, total } = await repo.findMany(query, (base) => scopeMessageFilter(base, requester.id, query.box));
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function sendMessage(input: SendMessageInput, requester: AuthenticatedUser): Promise<IMessage> {
  const recipient = await repo.findUserByEmail(input.recipientEmail);
  if (!recipient) throw ApiError.notFound('No user with that email address');
  if (recipient._id.toString() === requester.id) throw ApiError.badRequest('You cannot send a message to yourself');
  return repo.create(requester.id, recipient._id.toString(), input);
}

/** ONLY the recipient may mark a message read - not the sender (they can't vouch for the other
 * side having read it) and not an Administrator (they aren't a party to it at all: for a
 * non-party the message is indistinguishable from nonexistent, so they get the same 404 a
 * stranger would, not a 403 that would confirm the message exists). */
export async function markRead(id: string, requester: AuthenticatedUser): Promise<IMessage> {
  const message = await repo.findById(id);
  if (!message) throw ApiError.notFound('Message not found');
  const isParty = message.sender.toString() === requester.id || message.recipient.toString() === requester.id;
  if (!isParty) throw ApiError.notFound('Message not found');
  if (message.recipient.toString() !== requester.id)
    throw ApiError.forbidden('Only the recipient can mark a message as read');
  if (message.readAt) return message;
  const updated = await repo.markRead(id);
  if (!updated) throw ApiError.notFound('Message not found');
  return updated;
}
