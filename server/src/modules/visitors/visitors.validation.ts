import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const listVisitorsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['CheckedIn', 'CheckedOut']).optional(),
  }),
});

export const checkInSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    visitorName: z.string().trim().min(2).max(160),
    purpose: z.string().trim().min(1).max(300),
    hostName: z.string().trim().min(2).max(160),
  }),
});

export const visitorIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export type ListVisitorsQuery = z.infer<typeof listVisitorsSchema>['query'];
export type CheckInInput = z.infer<typeof checkInSchema>['body'];
