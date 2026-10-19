import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const listSurveysSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['Draft', 'Scheduled', 'Active', 'Closed']).optional(),
  }),
});

export const surveyIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export const createSurveySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    audience: z.enum(['All', 'Staff', 'Parents', 'Students']).default('All'),
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().min(1).max(1000),
    questions: z
      .array(
        z.object({
          questionText: z.string().trim().min(1).max(300),
          options: z
            .array(z.string().trim().min(1).max(120))
            .min(2, 'Each question needs at least 2 options')
            .max(20)
            .refine((v) => new Set(v).size === v.length, 'Options must be unique'),
        }),
      )
      .min(1, 'A survey needs at least one question')
      .max(30),
    scheduledAt: z.string().date().optional(),
  }),
});

export const submitResponseSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    answers: z
      .array(
        z.object({
          questionIndex: z.number().int().min(0),
          selectedOption: z.string().trim().min(1),
        }),
      )
      .min(1),
  }),
});

export type ListSurveysQuery = z.infer<typeof listSurveysSchema>['query'];
export type CreateSurveyInput = z.infer<typeof createSurveySchema>['body'];
export type SubmitResponseInput = z.infer<typeof submitResponseSchema>['body'];
