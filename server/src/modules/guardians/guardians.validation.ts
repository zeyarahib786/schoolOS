import { z } from 'zod';
import { GUARDIAN_PORTAL_STATUSES } from '../../models/Guardian';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const empty = z.object({}).optional();

export const listGuardiansSchema = z.object({
  body: empty,
  params: empty,
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    search: z.string().trim().max(120).optional(),
    portalStatus: z.enum(GUARDIAN_PORTAL_STATUSES).optional(),
  }),
});

export const guardianIdSchema = z.object({ body: empty, query: empty, params: z.object({ id: objectId }) });

export const updatePortalSchema = z.object({
  query: empty,
  params: z.object({ id: objectId }),
  body: z.object({ status: z.enum(['Active', 'Suspended']) }),
});

export const listBroadcastsSchema = z.object({
  body: empty,
  params: empty,
  query: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50) }),
});

export const sendBroadcastSchema = z.object({
  query: empty,
  params: empty,
  body: z
    .object({
      audience: z.enum(['All parents', 'By grade', 'Single class', 'Individual guardian']),
      grade: z.string().trim().max(60).optional(),
      className: z.string().trim().max(60).optional(),
      guardianId: objectId.optional(),
      channel: z.enum(['In-app + Email', 'SMS + Email', 'In-app only']).default('In-app + Email'),
      subject: z.string().trim().min(1).max(160),
      message: z.string().trim().min(1).max(600),
    })
    .superRefine((value, context) => {
      if (value.audience === 'By grade' && !value.grade)
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['grade'], message: 'Grade is required for this audience' });
      if (value.audience === 'Single class' && !value.className)
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['className'], message: 'Class is required for this audience' });
      if (value.audience === 'Individual guardian' && !value.guardianId)
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['guardianId'], message: 'Guardian is required for this audience' });
    }),
});

export const sendGuardianMessageSchema = z.object({
  query: empty,
  params: z.object({ id: objectId }),
  body: z.object({ text: z.string().trim().min(1).max(600) }),
});

export type ListGuardiansQuery = z.infer<typeof listGuardiansSchema>['query'];
export type ListBroadcastsQuery = z.infer<typeof listBroadcastsSchema>['query'];
export type SendBroadcastInput = z.infer<typeof sendBroadcastSchema>['body'];

