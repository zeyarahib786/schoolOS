import { z } from 'zod';

export const listAuditLogSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    module: z.string().trim().max(80).optional(),
    severity: z.enum(['Info', 'Warning', 'Critical']).optional(),
  }),
});

export type ListAuditLogQuery = z.infer<typeof listAuditLogSchema>['query'];

export const recordAuditExportSchema = z.object({ body: z.object({}).strict() });
