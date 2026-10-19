import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const listMessagesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    box: z.enum(['inbox', 'sent', 'all']).default('all'),
    archived: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
  }),
});

export const sendMessageSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    recipientEmail: z.string().trim().email(),
    replyTo: objectId.optional(),
    subject: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(5000),
  }),
});

export const messageIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export type ListMessagesQuery = z.infer<typeof listMessagesSchema>['query'];
export type SendMessageInput = z.infer<typeof sendMessageSchema>['body'];

export const archiveMessageSchema = messageIdParamSchema.extend({ body: z.object({ archived: z.boolean() }) });
