import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const dateFormat = z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');

export const listLeaveSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['Pending', 'Approved', 'Denied']).optional(),
  }),
});

export const requestLeaveSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z
    .object({
      staffId: objectId.optional(),
      fromDate: dateFormat,
      toDate: dateFormat,
      reason: z.string().trim().min(3).max(500),
    })
    .refine((b) => new Date(b.toDate).getTime() >= new Date(b.fromDate).getTime(), {
      message: 'toDate must not be before fromDate',
      path: ['toDate'],
    }),
});

export const decideLeaveSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    decision: z.enum(['Approved', 'Denied']),
  }),
});

export type ListLeaveQuery = z.infer<typeof listLeaveSchema>['query'];
export type RequestLeaveInput = z.infer<typeof requestLeaveSchema>['body'];
export type DecideLeaveInput = z.infer<typeof decideLeaveSchema>['body'];
