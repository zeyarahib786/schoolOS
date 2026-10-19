import { z } from 'zod';
import { calendarDateSchema } from '../../utils/calendarDate';

export const listStaffSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(120).optional(),
    department: z.string().trim().max(80).optional(),
    type: z.enum(['Teaching', 'Non-Teaching']).optional(),
    status: z.enum(['Active', 'Onboarding', 'On Leave', 'Inactive']).optional(),
  }),
  params: z.object({}).optional(),
});

export const staffIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid staff id') }),
});

export const staffDocumentParamSchema = z.object({
  body: z.any().optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid staff id'),
    key: z.enum(['id', 'degree', 'photo', 'experience', 'visa', 'attestation']),
  }),
});

export const onboardingTaskParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid staff id'),
    key: z.string().trim().min(1).max(40),
  }),
});

export const createStaffSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    refId: z.string().trim().min(1).max(30),
    name: z.string().trim().min(2).max(120),
    designation: z.string().trim().min(1).max(80),
    department: z.string().trim().min(1).max(80),
    type: z.enum(['Teaching', 'Non-Teaching']),
    status: z.enum(['Active', 'Onboarding', 'On Leave', 'Inactive']).optional(),
    email: z.string().trim().email(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ]{7,20}$/, 'Invalid phone number'),
    joinedDate: calendarDateSchema,
    annualLeaveRemaining: z.number().int().min(0).max(366).optional(),
  }),
});

export const updateStaffSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid staff id') }),
  body: createStaffSchema.shape.body
    .partial()
    .extend({ expectedUpdatedAt: z.string().datetime(), changeReason: z.string().trim().min(3).max(500) }),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>['body'];
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>['body'];
export type ListStaffQuery = z.infer<typeof listStaffSchema>['query'];

export const staffAccountSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i) }),
  body: z.object({
    email: z.string().email().nullable(),
    expectedUpdatedAt: z.string().datetime(),
    reason: z.string().trim().min(3).max(500),
  }),
});
export type StaffAccountInput = z.infer<typeof staffAccountSchema>['body'];
