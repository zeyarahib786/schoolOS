import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const examIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export const createExamSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().trim().min(2).max(120),
    term: z.string().trim().min(1).max(60),
    subjects: z.array(z.string().trim().min(1).max(60)).min(1, 'At least one subject is required'),
    maxMarks: z.number().int().positive().default(100),
    passMark: z.number().int().min(0).default(50),
  }).refine((value) => value.passMark <= value.maxMarks, {
    message: 'Pass mark cannot exceed maximum marks', path: ['passMark'],
  }),
});

export const addSubjectSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({ subject: z.string().trim().min(1).max(60) }),
});

export const removeSubjectSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId, subject: z.string().min(1) }),
  body: z.object({}).optional(),
});

export const listExamsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const listResultsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    examId: objectId.optional(),
    studentId: objectId.optional(),
  }),
});

export const recordResultSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    examId: objectId,
    studentId: objectId,
    scores: z
      .array(z.object({ subject: z.string().trim().min(1), marks: z.number().min(0) }))
      .min(1, 'At least one subject score is required'),
  }),
});

export const publishExamSchema = z.object({
  query: z.object({}).optional(), body: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export const generateReportCardsSchema = z.object({
  query: z.object({}).optional(), params: z.object({ id: objectId }),
  body: z.object({ grade: z.string().trim().min(1).max(80).optional() }),
});

export const notifyResultSchema = z.object({
  query: z.object({}).optional(), body: z.object({}).optional(),
  params: z.object({ id: objectId, studentId: objectId }),
});

export type CreateExamInput = z.infer<typeof createExamSchema>['body'];
export type ListExamsQuery = z.infer<typeof listExamsSchema>['query'];
export type ListResultsQuery = z.infer<typeof listResultsSchema>['query'];
export type RecordResultInput = z.infer<typeof recordResultSchema>['body'];
export type GenerateReportCardsInput = z.infer<typeof generateReportCardsSchema>['body'];
