import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const listVisitsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    studentId: objectId.optional(),
  }),
});

export const createVisitSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    studentId: objectId,
    reason: z.string().trim().min(1).max(500),
    treatment: z.string().trim().min(1).max(500),
    outcome: z.enum(['Returned to class', 'Sent home', 'Referred to hospital', 'Under observation']),
    severity: z.enum(['Routine', 'Urgent', 'Emergency']).default('Routine'),
    vitals: z.string().trim().max(300).optional(),
    medicine: z.string().trim().max(300).optional(),
  }),
});

export const updateVisitSchema = z.object({
  query: z.object({}).optional(), params: z.object({ id: objectId }),
  body: z.object({
    outcome: z.enum(['Returned to class', 'Sent home', 'Referred to hospital', 'Under observation']).optional(),
    parentContacted: z.boolean().optional(),
  }).refine((body) => body.outcome !== undefined || body.parentContacted !== undefined, { message: 'At least one update is required' }),
});

export type UpdateVisitInput = z.infer<typeof updateVisitSchema>['body'];

export type ListVisitsQuery = z.infer<typeof listVisitsSchema>['query'];
export type CreateVisitInput = z.infer<typeof createVisitSchema>['body'];
