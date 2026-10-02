import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const dateFormat = z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');
const timeFormat = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM 24h format');

export const listEventsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    audience: z.enum(['All', 'Students', 'Staff', 'Parents']).optional(),
  }),
});

/** A venue is entirely optional - the `venue` object, when present, is passed straight through
 * to the SAME booking-creation path Facilities uses, so the exact same overlap-prevention
 * transaction and validation (startTime < endTime, etc.) applies here with no duplicated logic
 * or duplicated risk of the two paths silently diverging over time. */
export const createEventSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().min(1).max(2000),
    date: dateFormat,
    audience: z.enum(['All', 'Students', 'Staff', 'Parents']).default('All'),
    venue: z
      .object({
        facilityId: objectId,
        startTime: timeFormat,
        endTime: timeFormat,
      })
      .refine((v) => v.startTime < v.endTime, { message: 'startTime must be before endTime', path: ['endTime'] })
      .optional(),
  }),
});

export type ListEventsQuery = z.infer<typeof listEventsSchema>['query'];
export type CreateEventInput = z.infer<typeof createEventSchema>['body'];
