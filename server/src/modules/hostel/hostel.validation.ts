import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const createRoomSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    roomNumber: z.string().trim().min(1).max(30),
    block: z.string().trim().min(1).max(60),
    capacity: z.number().int().positive(),
  }),
});

export const listRoomsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    block: z.string().trim().max(60).optional(),
  }),
});

export const allocateSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({ studentId: objectId }),
});

const dateFormat = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date');
export const listHostelLeaveSchema = z.object({
  body: z.object({}).optional(), params: z.object({}).optional(),
  query: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(['Requested', 'Approved', 'Out', 'Returned', 'Rejected']).optional() }),
});
export const createHostelLeaveSchema = z.object({
  query: z.object({}).optional(), params: z.object({}).optional(),
  body: z.object({ studentId: objectId, roomId: objectId, type: z.string().trim().min(1).max(60), fromDate: dateFormat, toDate: dateFormat, reason: z.string().trim().min(1).max(500) })
    .refine((body) => Date.parse(body.toDate) >= Date.parse(body.fromDate), { message: 'toDate must not be before fromDate', path: ['toDate'] }),
});
export const hostelLeaveTransitionSchema = z.object({
  query: z.object({}).optional(), params: z.object({ id: objectId }),
  body: z.object({ action: z.enum(['approve', 'reject', 'mark-out', 'return']) }),
});
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD');
export const listRollCallSchema = z.object({
  body: z.object({}).optional(), params: z.object({}).optional(),
  query: z.object({ date: isoDate }),
});
export const markRollCallSchema = z.object({
  query: z.object({}).optional(), params: z.object({}).optional(),
  body: z.object({ studentId: objectId, date: isoDate, status: z.enum(['Present', 'Late', 'On leave', 'Absent']) }),
});
export const markAllRollCallSchema = z.object({
  query: z.object({}).optional(), params: z.object({}).optional(), body: z.object({ date: isoDate }),
});
export const listHostelMaintenanceSchema = z.object({
  body: z.object({}).optional(), params: z.object({}).optional(),
  query: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(['Open', 'In progress', 'Resolved']).optional() }),
});
export const createHostelMaintenanceSchema = z.object({
  query: z.object({}).optional(), params: z.object({}).optional(),
  body: z.object({ refId: z.string().trim().min(1).max(40), roomId: objectId, issue: z.string().trim().min(3).max(300), category: z.string().trim().min(1).max(60), priority: z.enum(['High', 'Medium', 'Low']) }),
});
export const resolveHostelMaintenanceSchema = z.object({
  query: z.object({}).optional(), body: z.object({}).optional(), params: z.object({ id: objectId }),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>['body'];
export type ListRoomsQuery = z.infer<typeof listRoomsSchema>['query'];
export type ListHostelLeaveQuery = z.infer<typeof listHostelLeaveSchema>['query'];
export type CreateHostelLeaveInput = z.infer<typeof createHostelLeaveSchema>['body'];
export type MarkRollCallInput = z.infer<typeof markRollCallSchema>['body'];
export type ListHostelMaintenanceQuery = z.infer<typeof listHostelMaintenanceSchema>['query'];
export type CreateHostelMaintenanceInput = z.infer<typeof createHostelMaintenanceSchema>['body'];
