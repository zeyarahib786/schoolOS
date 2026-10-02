import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const dateFormat = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD').refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Invalid calendar date');

export const listCardsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['Active', 'Lost', 'Revoked']).optional(),
    subjectType: z.enum(['Student', 'Staff']).optional(),
  }),
});

export const issueCardSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    subjectType: z.enum(['Student', 'Staff']),
    subjectId: objectId,
    expiryDate: dateFormat,
  }),
});

export const cardIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export type ListCardsQuery = z.infer<typeof listCardsSchema>['query'];
export type IssueCardInput = z.infer<typeof issueCardSchema>['body'];
