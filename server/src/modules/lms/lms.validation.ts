import { z } from 'zod';
import { assessmentSchema } from './lms.assessment';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
import { calendarDateSchema } from '../../utils/calendarDate';
const dateFormat = z.union([calendarDateSchema, z.string().datetime({ offset: true })]);
const year = z
  .string()
  .regex(/^\d{4}-\d{4}$/)
  .refine((v) => Number(v.slice(5)) === Number(v.slice(0, 4)) + 1, 'Consecutive academic years required');

export const listAssignmentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    subject: z.string().trim().max(80).optional(),
    grade: z.string().trim().max(60).optional(),
    academicYear: z.string().max(20).optional(),
    course: objectId.optional(),
    archived: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  }),
});

export const createAssignmentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    academicYear: year.optional(),
    questions: assessmentSchema.optional(),
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().min(1).max(2000),
    subject: z.string().trim().min(1).max(80),
    grade: z.string().trim().min(1).max(60),
    dueDate: dateFormat,
    maxScore: z.number().min(1).max(10000),
    course: objectId.nullable().optional(),
    status: z.enum(['Draft', 'Scheduled', 'Published', 'Closed']).default('Published'),
    acceptLate: z.boolean().default(true),
    publishAt: z.string().datetime({ offset: true }).nullable().optional(),
    notifyEmail: z.boolean().default(false),
    remindersEnabled: z.boolean().default(false),
  }),
});

export const submitSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z
    .object({
      content: z.string().trim().max(5000).default(''),
      answers: z
        .array(z.object({ questionId: z.string().max(4), value: z.string().trim().min(1).max(1000) }))
        .max(30)
        .optional(),
    })
    .refine((v) => v.content.length > 0 || !!v.answers?.length, 'A response or question answers are required'),
});

export const gradeSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    score: z.number().min(0),
    feedback: z.string().trim().max(2000).optional(),
    expectedUpdatedAt: z.string().datetime(),
    reason: z.string().trim().min(3).max(500),
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

export const createCourseSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    academicYear: year.optional(),
    title: z.string().trim().min(2).max(160),
    teacher: z.string().trim().min(1).max(120),
    grade: z.string().trim().min(1).max(60),
    subject: z.string().trim().min(1).max(80).default('General'),
    startDate: calendarDateSchema.optional(),
  }),
});

export const updateAssignmentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: createAssignmentSchema.shape.body.partial().extend({
    academicYear: z.union([year, z.literal('Legacy')]).optional(),
    expectedUpdatedAt: z.string().datetime(),
    reason: z.string().trim().min(3).max(500),
  }),
});
export const updateCourseSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: createCourseSchema.shape.body.partial().extend({
    academicYear: z.union([year, z.literal('Legacy')]).optional(),
    archived: z.boolean().optional(),
    expectedUpdatedAt: z.string().datetime(),
    reason: z.string().trim().min(3).max(500),
  }),
});
export const submissionListSchema = z.object({
  params: z.object({}).optional(),
  body: z.object({}).optional(),
  query: z.object({ assignmentId: objectId.optional() }),
});
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>['body'];

export const teachingSchema = z.object({
  body: z.object({
    teacher: objectId,
    classSection: objectId,
    subject: z.string().trim().min(1).max(80),
    academicYear: year,
  }),
});
export const templateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().min(1).max(2000),
    subject: z.string().trim().min(1).max(80),
    maxScore: z.number().min(1).max(10000),
    acceptLate: z.boolean().default(true),
    shared: z.boolean().default(false),
  }),
});
export const batchAssignmentSchema = z.object({
  body: z.object({
    assignment: createAssignmentSchema.shape.body,
    grades: z.array(z.string().trim().min(1).max(60)).min(1).max(20),
    idempotencyKey: z.string().min(8).max(100),
  }),
});
