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
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
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
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['grade'],
          message: 'Grade is required for this audience',
        });
      if (value.audience === 'Single class' && !value.className)
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['className'],
          message: 'Class is required for this audience',
        });
      if (value.audience === 'Individual guardian' && !value.guardianId)
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['guardianId'],
          message: 'Guardian is required for this audience',
        });
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

const guardianInput = z.object({
  refId: z.string().trim().toUpperCase().min(1).max(30),
  name: z.string().trim().min(2).max(120),
  relation: z.enum(['Parent', 'Father', 'Mother', 'Guardian', 'Other']),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{7,20}$/, 'Enter a valid guardian phone'),
  email: z.union([z.string().trim().toLowerCase().email().max(254), z.literal('')]).optional(),
  studentIds: z
    .array(objectId)
    .max(50)
    .refine((ids) => new Set(ids).size === ids.length, 'Duplicate linked children'),
  pickupAuthorized: z.boolean(),
  financialResponsible: z.boolean(),
  custody: z.string().trim().min(1).max(300),
  consents: z.object({ media: z.boolean().nullable(), trips: z.boolean().nullable(), medical: z.boolean().nullable() }),
  note: z.string().trim().max(600).optional(),
});
export const createGuardianSchema = z.object({ params: empty, query: empty, body: guardianInput });
export const updateGuardianSchema = z.object({
  params: z.object({ id: objectId }),
  query: empty,
  body: guardianInput.omit({ refId: true }).extend({ expectedUpdatedAt: z.string().datetime() }),
});
export const guardianAccountSchema = z.object({
  params: z.object({ id: objectId }),
  query: empty,
  body: z.object({
    parentEmail: z.string().trim().toLowerCase().email().nullable(),
    expectedUpdatedAt: z.string().datetime(),
  }),
});
export type GuardianInput = z.infer<typeof guardianInput>;
