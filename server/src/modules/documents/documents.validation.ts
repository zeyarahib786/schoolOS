import { z } from 'zod';

export const listDocumentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    q: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    category: z.enum(['Policy', 'Form', 'Circular', 'Guideline']).optional(),
    includeSuperseded: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    code: z.string().trim().max(30).optional(),
  }),
});

export const publishDocumentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    expectedVersion: z.number().int().min(0).optional(),
    publicationReason: z.string().trim().min(3).max(500).optional(),
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2,5}-[0-9]{2,5}$/, 'code must look like POL-001'),
    title: z.string().trim().min(2).max(160),
    category: z.enum(['Policy', 'Form', 'Circular', 'Guideline']),
    description: z.string().trim().min(1).max(2000),
  }),
});

export type ListDocumentsQuery = z.infer<typeof listDocumentsSchema>['query'];
export type PublishDocumentInput = z.infer<typeof publishDocumentSchema>['body'];

export const documentIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid document id') }),
});
