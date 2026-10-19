import { z } from 'zod';
const id = z.string().regex(/^[a-f\d]{24}$/i);
export const queueNotificationSchema = z.object({
  body: z.object({
    recipientEmail: z.string().trim().email(),
    channel: z.enum(['Email', 'SMS']),
    subject: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(5000),
    idempotencyKey: z.string().trim().min(8).max(100),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
export const listNotificationsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const deliveryIdSchema = z.object({
  params: z.object({ id }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});
export type QueueNotificationInput = z.infer<typeof queueNotificationSchema>['body'];
