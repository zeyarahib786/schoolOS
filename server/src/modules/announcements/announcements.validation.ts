import { z } from 'zod';

export const listAnnouncementsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const createAnnouncementSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    title: z.string().trim().min(2).max(160),
    body: z.string().trim().min(1).max(3000),
    audience: z.enum(['All', 'Staff', 'Parents', 'Students']).default('All'),
    pinned: z.boolean().default(false),
    status: z.enum(['Draft', 'Pending approval', 'Published']).default('Published'),
  }),
});

export const changeAnnouncementStatusSchema = z.object({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }),
  body: z.object({ status: z.enum(['Pending approval', 'Published', 'Draft']) }),
  query: z.object({}).optional(),
});

export type ListAnnouncementsQuery = z.infer<typeof listAnnouncementsSchema>['query'];
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>['body'];
export type ChangeAnnouncementStatusInput = z.infer<typeof changeAnnouncementStatusSchema>['body'];
