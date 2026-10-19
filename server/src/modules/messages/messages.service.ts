import { InboxNotification } from '../../models/InboxNotification';
import { Message } from '../../models/Message';
import { assertGuardianPortalAccess } from '../guardians/guardians.access';
import { ApiError } from '../../utils/ApiError';
import { IMessage } from '../../models/Message';
import * as repo from './messages.repository';
import { ListMessagesQuery, SendMessageInput } from './messages.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeMessageFilter } from './messages.ownership';

export async function listMessages(query: ListMessagesQuery, requester: AuthenticatedUser) {
  const { items, total } = await repo.findMany(
    query,
    (base) => scopeMessageFilter(base, requester.id, query.box),
    requester.id,
  );
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function sendMessage(input: SendMessageInput, requester: AuthenticatedUser): Promise<IMessage> {
  const recipient = await repo.findUserByEmail(input.recipientEmail);
  if (!recipient || !recipient.isActive) throw ApiError.notFound('No active user with that email address');
  await assertGuardianPortalAccess(recipient._id.toString(), recipient.role);
  if (input.replyTo) {
    const previous = await repo.findById(input.replyTo);
    if (
      !previous ||
      ![previous.sender.toString(), previous.recipient.toString()].includes(requester.id) ||
      ![previous.sender.toString(), previous.recipient.toString()].includes(recipient._id.toString())
    )
      throw ApiError.notFound('Reply conversation not found');
  }
  if (recipient._id.toString() === requester.id) throw ApiError.badRequest('You cannot send a message to yourself');
  const message = await repo.create(requester.id, recipient._id.toString(), input);
  await InboxNotification.updateOne(
    { recipient: recipient._id, eventKey: 'message:' + message._id },
    {
      $setOnInsert: {
        title: 'New school message',
        body: message.subject,
        module: 'communication',
        recordId: message._id,
      },
    },
    { upsert: true },
  );
  return message;
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
  const updated = (await repo.markRead(id)) || (await repo.findById(id));
  if (!updated) throw ApiError.notFound('Message not found');
  return updated;
}

export async function archiveMessage(id: string, archived: boolean, requester: AuthenticatedUser) {
  const row = await Message.findOneAndUpdate(
    { _id: id, $or: [{ sender: requester.id }, { recipient: requester.id }] },
    archived ? { $addToSet: { archivedBy: requester.id } } : { $pull: { archivedBy: requester.id } },
    { new: true },
  );
  if (!row) throw ApiError.notFound('Message not found');
  return row;
}
