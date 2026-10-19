import { z } from 'zod';
import { calendarDateSchema as date } from '../../utils/calendarDate';

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
  body: z
    .object({
      studentId: objectId,
      category: z.string().trim().min(1).max(80),
      description: z.string().trim().min(1).max(1000),
      severity: z.enum(['Minor', 'Moderate', 'Serious']).default('Minor'),
      actionTaken: z.string().trim().max(1000).optional(),
      type: z.enum(['Merit', 'Incident', 'Detention', 'Pastoral note']).default('Incident'),
      points: z.number().int().min(-100).max(100).optional(),
      incidentDate: date.optional(),
      followUpDate: date.optional(),
      visibility: z.enum(['Shared with family', 'Staff only']).optional(),
      location: z.string().trim().max(120).optional(),
      witness: z.string().trim().max(120).optional(),
    })
    .transform((v) => ({
      ...v,
      points: v.points ?? (v.type === 'Merit' ? 2 : v.type === 'Pastoral note' ? 0 : -2),
      visibility: v.visibility || (v.type === 'Pastoral note' ? 'Staff only' : 'Shared with family'),
    }))
    .superRefine((v, ctx) => {
      if (
        (v.type === 'Merit' && v.points < 0) ||
        (['Incident', 'Detention'].includes(v.type) && v.points > 0) ||
        (v.type === 'Pastoral note' && v.points !== 0)
      )
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['points'], message: 'Points must match the entry type' });
    }),
});

export const updateIncidentStatusSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(['Logged', 'Escalated', 'Closed']),
    expectedUpdatedAt: z.string().datetime(),
    reason: z.string().trim().min(3).max(500),
    actionTaken: z.string().trim().max(1000).optional(),
    followUpDate: date.nullable().optional(),
    assignedToEmail: z.string().email().nullable().optional(),
  }),
});

export type ListIncidentsQuery = z.infer<typeof listIncidentsSchema>['query'];
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>['body'];

export type UpdateIncidentInput = z.infer<typeof updateIncidentStatusSchema>['body'];
