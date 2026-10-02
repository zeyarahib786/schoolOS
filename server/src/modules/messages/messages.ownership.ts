import { FilterQuery } from 'mongoose';
import { IMessage } from '../../models/Message';

/** The bidirectional $or scope: a user sees a message iff they are a party to it. Applied to
 * EVERY role identically - there is deliberately no unrestricted-read branch here, making this
 * the first module where an Administrator's view is exactly as narrow as anyone else's. */
export function scopeMessageFilter(
  base: FilterQuery<IMessage>,
  userId: string,
  box: 'inbox' | 'sent' | 'all',
): FilterQuery<IMessage> {
  if (box === 'inbox') return { ...base, recipient: userId };
  if (box === 'sent') return { ...base, sender: userId };
  return { ...base, $or: [{ sender: userId }, { recipient: userId }] };
}
