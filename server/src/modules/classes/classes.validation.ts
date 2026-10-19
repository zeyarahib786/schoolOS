import { z } from 'zod';
import { CLASS_STREAMS } from '../../models/ClassSection';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const grade = z
  .string()
  .trim()
  .regex(/^(KG [12]|Grade ([1-9]|1[0-2]))$/, 'Invalid grade');

export const listClassesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    search: z.string().trim().max(100).optional(),
    stream: z.enum(CLASS_STREAMS).optional(),
  }),
});

export const createClassSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    grade,
    section: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-F]$/, 'Section must be A to F'),
    stream: z.enum(CLASS_STREAMS).default('General'),
    teacherStaffId: objectId.optional(),
    room: z.string().trim().max(60).default(''),
    capacity: z.number().int().min(1).max(100).default(30),
  }),
});

export type ListClassesQuery = z.infer<typeof listClassesSchema>['query'];
export type CreateClassInput = z.infer<typeof createClassSchema>['body'];

export const updateClassSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
  body: z.object({
    capacity: z.number().int().min(1).max(100),
    stream: z.enum(CLASS_STREAMS),
    room: z.string().trim().max(60).default(''),
    teacherStaffId: objectId.nullable().optional(),
    status: z.enum(['Active', 'Archived']),
    expectedUpdatedAt: z.string().datetime(),
  }),
});
export type UpdateClassInput = z.infer<typeof updateClassSchema>['body'];
