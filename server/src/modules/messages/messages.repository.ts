import { FilterQuery } from 'mongoose';
import { Message, IMessage } from '../../models/Message';
import { User } from '../../models/User';
import { ListMessagesQuery, SendMessageInput } from './messages.validation';

export async function findMany(
  query: ListMessagesQuery,
  applyOwnershipScope: (base: FilterQuery<IMessage>) => FilterQuery<IMessage>,
): Promise<{ items: IMessage[]; total: number }> {
  const filter = applyOwnershipScope({});
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Message.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('sender', 'name email role')
      .populate('recipient', 'name email role'),
    Message.countDocuments(filter),
  ]);
  return { items, total };
}

export function findUserByEmail(email: string) {
  return User.findOne({ email: email.toLowerCase() }).select('_id');
}

export function create(senderId: string, recipientId: string, input: SendMessageInput): Promise<IMessage> {
  return Message.create({ sender: senderId, recipient: recipientId, subject: input.subject, body: input.body });
}

export function findById(id: string): Promise<IMessage | null> {
  return Message.findById(id);
}

export function markRead(id: string): Promise<IMessage | null> {
  return Message.findByIdAndUpdate(id, { readAt: new Date() }, { new: true });
}
