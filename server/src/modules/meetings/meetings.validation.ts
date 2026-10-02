import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const dateFormat = z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');

export const listSlotsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    onlyOpen: z.coerce.boolean().optional(),
  }),
});

export const createSlotSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    teacherStaffId: objectId,
    date: dateFormat,
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'startTime must be HH:MM'),
    room: z.string().trim().min(1).max(80).default('TBC'),
    note: z.string().trim().max(600).optional(),
  }),
});

export const bookSlotSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    studentId: objectId,
  }),
});

export const staffBookSlotSchema = z.object({
  query: z.object({}).optional(), params: z.object({ id: objectId }),
  body: z.object({ guardianId: objectId, studentId: objectId, note: z.string().trim().max(600).optional() }),
});

export const slotIdSchema = z.object({
  query: z.object({}).optional(), body: z.object({}).optional(), params: z.object({ id: objectId }),
});

export const rescheduleSlotSchema = z.object({
  query: z.object({}).optional(), params: z.object({ id: objectId }),
  body: z.object({ targetSlotId: objectId }),
});

export type ListSlotsQuery = z.infer<typeof listSlotsSchema>['query'];
export type CreateSlotInput = z.infer<typeof createSlotSchema>['body'];
export type BookSlotInput = z.infer<typeof bookSlotSchema>['body'];
export type StaffBookSlotInput = z.infer<typeof staffBookSlotSchema>['body'];
