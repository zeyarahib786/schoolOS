import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
import { calendarDateSchema as dateFormat } from '../../utils/calendarDate';
const year = z
  .string()
  .regex(/^\d{4}-\d{4}$/)
  .refine((v) => Number(v.slice(5)) === Number(v.slice(0, 4)) + 1, 'Academic year must cover consecutive years');

export const listUnitsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    subject: z.string().trim().max(80).optional(),
    grade: z.string().trim().max(60).optional(),
    academicYear: z.string().max(20).optional(),
    term: z.string().trim().max(60).optional(),
    archived: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    search: z.string().trim().max(120).optional(),
  }),
});

export const unitIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export const createUnitSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    grade: z.string().trim().min(1).max(60).default('All grades'),
    academicYear: year.optional(),
    subject: z.string().trim().min(1).max(80),
    term: z.string().trim().min(1).max(60),
    title: z.string().trim().min(2).max(160),
    outcomes: z.string().trim().min(1).max(2000),
    sequenceOrder: z.number().int().min(0).optional(),
    plannedDate: dateFormat.optional(),
    completedDate: dateFormat.nullable().optional(),
    framework: z.string().trim().min(1).max(120).optional(),
    owner: z.string().trim().min(1).max(120).optional(),
  }),
});

export const updateUnitSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: createUnitSchema.shape.body.partial().extend({
    academicYear: z.union([year, z.literal('Legacy')]).optional(),
    plannedDate: dateFormat.nullable().optional(),
    expectedUpdatedAt: z.string().datetime(),
    reason: z.string().trim().min(3).max(500),
  }),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>['body'];
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>['body'];
export type ListUnitsQuery = z.infer<typeof listUnitsSchema>['query'];

export const archiveUnitSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    archived: z.boolean(),
    expectedUpdatedAt: z.string().datetime(),
    reason: z.string().trim().min(3).max(500),
  }),
});
