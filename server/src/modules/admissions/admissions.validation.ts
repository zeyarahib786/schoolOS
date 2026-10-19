import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const listApplicationsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z
      .enum(['Applied', 'Shortlisted', 'Interviewed', 'Accepted', 'Enrolled', 'Rejected', 'Waitlisted'])
      .optional(),
  }),
});

export const createApplicationSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    applicantName: z.string().trim().min(2).max(120),
    gradeAppliedFor: z.string().trim().min(1).max(60),
    gender: z.enum(['Male', 'Female']),
    guardianName: z.string().trim().min(2).max(120),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ]{7,20}$/, 'Invalid phone number'),
    dateOfBirth: z.coerce.date().max(new Date(), 'Date of birth cannot be in the future').optional(),
    nationality: z.string().trim().max(80).optional(),
    guardianRelationship: z.enum(['Father', 'Mother', 'Guardian', 'Other']).optional(),
    guardianEmail: z.string().trim().email().max(254).optional(),
    source: z.enum(['Website', 'Walk-in', 'Referral', 'Agent', 'Event']).optional(),
    previousSchool: z.string().trim().max(160).optional(),
    notes: z.string().trim().max(1000).optional(),
  }),
});

export const transitionSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(['Shortlisted', 'Interviewed', 'Accepted', 'Rejected', 'Waitlisted', 'Applied']),
    reason: z.string().trim().min(1).max(400).optional(),
    outcome: z.enum(['Rejected', 'Withdrawn', 'Deferred to next intake']).optional(),
  }),
});

export const admissionDocumentParamSchema = z.object({
  body: z.any().optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId, key: z.enum(['id', 'birth', 'photo', 'report', 'immun', 'tc']) }),
});

export const enrollSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    refId: z.string().trim().min(1).max(30),
    roll: z.string().trim().min(1).max(20),
  }),
});

export type ListApplicationsQuery = z.infer<typeof listApplicationsSchema>['query'];
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>['body'];
export type TransitionInput = z.infer<typeof transitionSchema>['body'];
export type EnrollInput = z.infer<typeof enrollSchema>['body'];
