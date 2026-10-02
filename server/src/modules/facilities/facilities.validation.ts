import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const timeFormat = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM 24h format');
const dateFormat = z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');

export const listBookingsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    facilityId: objectId.optional(),
    date: dateFormat.optional(),
  }),
});

export const createBookingSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z
    .object({
      facilityId: objectId,
      date: dateFormat,
      startTime: timeFormat,
      endTime: timeFormat,
      purpose: z.string().trim().min(1).max(300),
    })
    .refine((v) => v.startTime < v.endTime, { message: 'startTime must be before endTime', path: ['endTime'] }),
});

export const createFacilitySchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().trim().min(1).max(120),
    type: z.string().trim().min(1).max(80),
    capacity: z.number().int().positive(),
  }),
});

export type ListBookingsQuery = z.infer<typeof listBookingsSchema>['query'];
export type CreateBookingInput = z.infer<typeof createBookingSchema>['body'];
export type CreateFacilityInput = z.infer<typeof createFacilitySchema>['body'];
