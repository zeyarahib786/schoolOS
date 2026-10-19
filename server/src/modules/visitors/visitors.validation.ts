import { z } from 'zod';
import { calendarDateSchema } from '../../utils/calendarDate';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const listVisitorsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['CheckedIn', 'CheckedOut']).optional(),
    date: calendarDateSchema.optional(),
  }),
});

export const checkInSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    visitorName: z.string().trim().min(2).max(160),
    purpose: z.string().trim().min(1).max(300),
    hostName: z.string().trim().min(2).max(160),
    phone: z.string().trim().max(50).optional(),
    organization: z.string().trim().max(200).optional(),
    badge: z.string().trim().min(1).max(60).optional(),
    hostConfirmed: z.boolean().default(false),
    identityChecked: z.boolean().default(false),
    notes: z.string().trim().max(1000).optional(),
  }),
});

export const visitorIdParamSchema = z.object({
  body: z
    .object({
      expectedUpdatedAt: z.string().datetime().optional(),
      reason: z.string().trim().min(3).max(500).optional(),
    })
    .optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export type ListVisitorsQuery = z.infer<typeof listVisitorsSchema>['query'];
export type CheckInInput = z.infer<typeof checkInSchema>['body'];

export const updateVisitorSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
  body: z.object({
    hostConfirmed: z.boolean().optional(),
    visitorName: z.string().trim().min(2).max(160),
    hostName: z.string().trim().min(2).max(160),
    purpose: z.string().trim().min(1).max(300),
    phone: z.string().trim().max(50),
    organization: z.string().trim().max(200),
    notes: z.string().trim().max(1000),
    expectedUpdatedAt: z.string().datetime(),
    reason: z.string().trim().min(3).max(500),
  }),
});
