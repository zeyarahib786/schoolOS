import { z } from 'zod';
import { CRM_SOURCES, CRM_STAGES, CRM_TEMPERATURES } from '../../models/CrmLead';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const grade = z
  .string()
  .trim()
  .regex(/^(KG [12]|Grade ([1-9]|1[0-2]))$/, 'Invalid grade');
const empty = z.object({}).optional();

export const listCrmLeadsSchema = z.object({
  body: empty,
  params: empty,
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    search: z.string().trim().max(100).optional(),
    stage: z.enum(CRM_STAGES).optional(),
    archived: z.enum(['true', 'false']).optional(),
  }),
});
export const createCrmLeadSchema = z.object({
  query: empty,
  params: empty,
  body: z.object({
    name: z.string().trim().min(2).max(120),
    grade,
    source: z.enum(CRM_SOURCES).default('Website'),
    phone: z.string().trim().max(30).optional(),
    guardian: z.string().trim().max(120).optional(),
    guardianEmail: z.string().trim().email().max(254).optional(),
    owner: z.string().trim().min(2).max(120).default('Front Office'),
    temperature: z.enum(CRM_TEMPERATURES).default('Warm'),
    followUpDate: z.coerce.date().optional(),
    notes: z.string().trim().max(400).optional(),
  }),
});
export const crmIdSchema = z.object({ body: empty, query: empty, params: z.object({ id: objectId }) });
export const scheduleFollowUpSchema = z.object({
  query: empty,
  params: z.object({ id: objectId }),
  body: z.object({
    date: z.coerce.date(),
    type: z.string().trim().min(1).max(80).default('Scheduled'),
    note: z.string().trim().max(400).optional(),
  }),
});
export const logCrmActivitySchema = z.object({
  query: empty,
  params: z.object({ id: objectId }),
  body: z.object({
    type: z.enum(['Call', 'Email', 'SMS', 'Meeting', 'Campus tour', 'Note', 'Called', 'WhatsApp']),
    outcome: z.enum(['Interested', 'Needs info', 'Booked tour', 'Not reachable', 'Not interested']).optional(),
    notes: z.string().trim().max(400).optional(),
    temperature: z.enum(CRM_TEMPERATURES).optional(),
  }),
});
export const archiveCrmLeadSchema = z.object({
  query: empty,
  params: z.object({ id: objectId }),
  body: z.object({
    reason: z.string().trim().min(1).max(400),
    note: z.string().trim().max(400).optional(),
  }),
});
export type ListCrmLeadsQuery = z.infer<typeof listCrmLeadsSchema>['query'];
export type CreateCrmLeadInput = z.infer<typeof createCrmLeadSchema>['body'];
export type ScheduleFollowUpInput = z.infer<typeof scheduleFollowUpSchema>['body'];
export type LogCrmActivityInput = z.infer<typeof logCrmActivitySchema>['body'];
export type ArchiveCrmLeadInput = z.infer<typeof archiveCrmLeadSchema>['body'];

export const editCrmLeadSchema = z.object({
  query: empty,
  params: z.object({ id: objectId }),
  body: z
    .object({
      name: z.string().trim().min(2).max(120),
      grade,
      source: z.enum(CRM_SOURCES),
      phone: z.string().trim().max(30),
      guardian: z.string().trim().max(120),
      guardianEmail: z.union([z.string().trim().email().max(254), z.literal('')]),
      temperature: z.enum(CRM_TEMPERATURES),
      updatedAt: z.string().datetime(),
    })
    .strict(),
});
export const bulkCrmEmailSchema = z.object({
  body: z
    .object({
      recipients: z
        .array(z.object({ id: objectId, email: z.string().trim().email().max(254) }).strict())
        .min(1)
        .max(100),
      subject: z.string().trim().min(1).max(160),
      body: z.string().trim().min(1).max(5000),
      idempotencyKey: z.string().min(8).max(100),
    })
    .strict(),
});
export type EditCrmLeadInput = z.infer<typeof editCrmLeadSchema>['body'];
