import { z } from 'zod';
import { assessmentSchema } from './lms.assessment';
const id = z.string().regex(/^[a-f\d]{24}$/i);
export const aiRequest = z.object({
  kind: z.enum(['Assignment', 'Quiz', 'LessonPlan', 'Feedback', 'ParentMessage', 'Progress']),
  grade: z.string().trim().min(1).max(60),
  subject: z.string().trim().min(1).max(80),
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{4}$/)
    .refine((v) => Number(v.slice(5)) === Number(v.slice(0, 4)) + 1, 'Consecutive academic years required'),
  topic: z.string().trim().min(2).max(500),
  instructions: z.string().trim().max(2000).default(''),
  language: z.enum(['English', 'Arabic']).default('English'),
  difficulty: z.enum(['Support', 'Standard', 'Challenge']).default('Standard'),
  questionCount: z.number().int().min(1).max(20).default(5),
  maxScore: z.number().int().min(1).max(100).default(20),
  reportDays: z.number().int().min(7).max(90).default(30),
  duration: z.number().int().min(10).max(180).default(40),
  studentId: id.optional(),
  submissionId: id.optional(),
});
export type AiRequest = z.infer<typeof aiRequest>;
export const aiContent = z.object({
  title: z.string().trim().min(2).max(160),
  body: z.string().trim().min(1).max(5000),
  questions: assessmentSchema,
  suggestedScore: z.number().min(0).max(10000).nullable(),
  warnings: z.array(z.string().trim().min(1).max(500)).max(10),
});
export type AiContent = z.infer<typeof aiContent>;
export const aiGenerateSchema = z.object({ body: aiRequest.extend({ requestId: z.string().uuid() }) });
export const aiIdSchema = z.object({ params: z.object({ id }) });
export const aiEditSchema = z.object({
  params: z.object({ id }),
  body: z.object({ content: aiContent, expectedUpdatedAt: z.string().datetime() }),
});
export const aiApplySchema = z.object({
  params: z.object({ id }),
  body: z.object({
    expectedUpdatedAt: z.string().datetime(),
    reviewed: z.literal(true),
    action: z.enum(['SaveAssignment', 'Grade', 'Message']),
    dueDate: z.string().datetime({ offset: true }).optional(),
    status: z.enum(['Draft', 'Scheduled', 'Published']).default('Draft'),
    publishAt: z.string().datetime({ offset: true }).optional(),
    channel: z.enum(['InApp', 'Email', 'SMS']).default('InApp'),
  }),
});
export type AiApply = z.infer<typeof aiApplySchema>['body'];
