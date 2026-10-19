import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const listAlumniSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    graduationYear: z.coerce.number().int().optional(),
  }),
});

export const graduateSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    studentId: objectId,
    academicCompletionConfirmed: z.boolean().default(false),
    expectedUpdatedAt: z.string().datetime().optional(),
    graduationYear: z.number().int().min(1990).max(2100),
    currentEmployer: z.string().trim().max(200).optional(),
    contactEmail: z.string().trim().email().optional(),
    notes: z.string().trim().max(1000).optional(),
  }),
});

export type ListAlumniQuery = z.infer<typeof listAlumniSchema>['query'];
export type GraduateInput = z.infer<typeof graduateSchema>['body'];

export const updateAlumniSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
  body: z.object({
    expectedUpdatedAt: z.string().datetime(),
    reason: z.string().trim().min(3).max(500),
    currentEmployer: z.string().trim().max(200),
    contactEmail: z.string().trim().email().or(z.literal('')),
    allowContact: z.boolean(),
    notes: z.string().trim().max(1000).optional(),
  }),
});
export const alumniStudentSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});
