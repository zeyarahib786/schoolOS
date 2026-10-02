import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const listIncidentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    studentId: objectId.optional(),
    severity: z.enum(['Minor', 'Moderate', 'Serious']).optional(),
  }),
});

export const createIncidentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    studentId: objectId,
    category: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(1000),
    severity: z.enum(['Minor', 'Moderate', 'Serious']).default('Minor'),
    actionTaken: z.string().trim().max(1000).optional(),
    type: z.enum(['Merit', 'Incident', 'Detention', 'Pastoral note']).default('Incident'),
    points: z.number().int().min(-100).max(100).default(-2),
    location: z.string().trim().max(120).optional(),
    witness: z.string().trim().max(120).optional(),
  }),
});

export const updateIncidentStatusSchema = z.object({
  query: z.object({}).optional(), params: z.object({ id: objectId }),
  body: z.object({ status: z.enum(['Escalated', 'Closed']) }),
});

export type ListIncidentsQuery = z.infer<typeof listIncidentsSchema>['query'];
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>['body'];
