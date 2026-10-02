import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const dateFormat = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date');

export const listUnitsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    subject: z.string().trim().max(80).optional(),
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
  body: createUnitSchema.shape.body.partial(),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>['body'];
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>['body'];
export type ListUnitsQuery = z.infer<typeof listUnitsSchema>['query'];
