import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const dateFormat = z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');

export const listAssignmentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    subject: z.string().trim().max(80).optional(),
    grade: z.string().trim().max(60).optional(),
  }),
});

export const createAssignmentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().min(1).max(2000),
    subject: z.string().trim().min(1).max(80),
    grade: z.string().trim().min(1).max(60),
    dueDate: dateFormat,
    maxScore: z.number().positive(),
  }),
});

export const submitSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    content: z.string().trim().min(1).max(5000),
  }),
});

export const gradeSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    score: z.number().min(0),
    feedback: z.string().trim().max(2000).optional(),
  }),
});

export const assignmentIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export type ListAssignmentsQuery = z.infer<typeof listAssignmentsSchema>['query'];
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>['body'];
export type SubmitInput = z.infer<typeof submitSchema>['body'];
export type GradeInput = z.infer<typeof gradeSchema>['body'];
