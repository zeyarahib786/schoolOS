import { z } from 'zod';

export const listSlotsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    grade: z.string().trim().max(60).optional(),
    dayOfWeek: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']).optional(),
  }),
});

export const createSlotSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    grade: z.string().trim().min(1).max(60),
    dayOfWeek: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
    periodNumber: z.number().int().min(1).max(8),
    subject: z.string().trim().min(1).max(80),
    teacherName: z.string().trim().min(2).max(120),
    room: z.string().trim().max(80).optional(),
    isSubstitute: z.boolean().optional(),
  }),
});

export type ListSlotsQuery = z.infer<typeof listSlotsSchema>['query'];
const slotId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const updateSlotSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: slotId }),
  body: z
    .object({
      subject: z.string().trim().min(1).max(80).optional(),
      teacherName: z.string().trim().min(2).max(120).optional(),
      room: z.string().trim().max(80).optional(),
      isSubstitute: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required'),
});

export const slotIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: slotId }),
});

export const publishGradeSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({ grade: z.string().trim().min(1).max(60) }),
});

const positionSchema = z.object({
  dayOfWeek: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
  periodNumber: z.number().int().min(1).max(8),
});

export const swapSlotsSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z
    .object({
      grade: z.string().trim().min(1).max(60),
      source: positionSchema,
      target: positionSchema,
    })
    .refine(
      ({ source, target }) => source.dayOfWeek !== target.dayOfWeek || source.periodNumber !== target.periodNumber,
      'Source and target must be different',
    ),
});

export type UpdateSlotInput = z.infer<typeof updateSlotSchema>['body'];
export type SwapSlotsInput = z.infer<typeof swapSlotsSchema>['body'];
export type CreateSlotInput = z.infer<typeof createSlotSchema>['body'];
