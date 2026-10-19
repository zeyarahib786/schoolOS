import { z } from 'zod';

import { calendarDateSchema } from '../../utils/calendarDate';
const version = z.string().datetime(),
  changeReason = z.string().trim().min(3).max(500);
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const createRoomSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    roomNumber: z.string().trim().min(1).max(30),
    block: z.string().trim().min(1).max(60),
    capacity: z.number().int().positive().max(100),
    genderPolicy: z.enum(['Any', 'Male', 'Female']).default('Any'),
    warden: z.string().trim().max(120).optional(),
    wardenPhone: z.string().trim().max(30).optional(),
  }),
});

export const listRoomsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    block: z.string().trim().max(60).optional(),
    archived: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  }),
});

export const allocateSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({ studentId: objectId, bedLabel: z.string().trim().max(30).optional() }),
});

const dateFormat = calendarDateSchema;
export const listHostelLeaveSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['Requested', 'Approved', 'Out', 'Returned', 'Rejected', 'Cancelled']).optional(),
  }),
});
export const createHostelLeaveSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z
    .object({
      studentId: objectId,
      roomId: objectId,
      type: z.string().trim().min(1).max(60),
      fromDate: dateFormat,
      toDate: dateFormat,
      reason: z.string().trim().min(1).max(500),
    })
    .refine((body) => Date.parse(body.toDate) >= Date.parse(body.fromDate), {
      message: 'toDate must not be before fromDate',
      path: ['toDate'],
    }),
});
export const hostelLeaveTransitionSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    action: z.enum(['approve', 'reject', 'mark-out', 'return', 'cancel']),
    expectedUpdatedAt: version,
    reason: changeReason,
    pickupName: z.string().trim().max(120).optional(),
    pickupPhone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ]{7,20}$/)
      .optional(),
    guardianConsentConfirmed: z.boolean().optional(),
  }),
});
const isoDate = calendarDateSchema;
export const listRollCallSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ date: isoDate }),
});
export const markRollCallSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    studentId: objectId,
    date: isoDate,
    status: z.enum(['Present', 'Late', 'On leave', 'Absent']),
    expectedUpdatedAt: version.optional(),
    reason: changeReason.optional(),
  }),
});
export const markAllRollCallSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({ date: isoDate }),
});
export const listHostelMaintenanceSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['Open', 'In progress', 'Resolved']).optional(),
  }),
});
export const createHostelMaintenanceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    refId: z.string().trim().min(1).max(40),
    roomId: objectId,
    issue: z.string().trim().min(3).max(300),
    category: z.string().trim().min(1).max(60),
    priority: z.enum(['High', 'Medium', 'Low']),
  }),
});
export const resolveHostelMaintenanceSchema = z.object({
  query: z.object({}).optional(),
  body: z.object({
    expectedUpdatedAt: version,
    reason: changeReason,
    resolution: z.string().trim().min(3).max(1000),
    status: z.enum(['Open', 'In progress', 'Resolved']).default('Resolved'),
  }),
  params: z.object({ id: objectId }),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>['body'];
export type ListRoomsQuery = z.infer<typeof listRoomsSchema>['query'];
export type ListHostelLeaveQuery = z.infer<typeof listHostelLeaveSchema>['query'];
export type CreateHostelLeaveInput = z.infer<typeof createHostelLeaveSchema>['body'];
export type MarkRollCallInput = z.infer<typeof markRollCallSchema>['body'];
export type ListHostelMaintenanceQuery = z.infer<typeof listHostelMaintenanceSchema>['query'];
export type CreateHostelMaintenanceInput = z.infer<typeof createHostelMaintenanceSchema>['body'];

export const reviewRoomSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
  body: createRoomSchema.shape.body.partial().extend({
    status: z.enum(['Available', 'Unavailable']).optional(),
    archived: z.boolean().optional(),
    expectedUpdatedAt: version,
    reason: changeReason,
  }),
});
export const dischargeSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
  body: z.object({ studentId: objectId, expectedUpdatedAt: version, reason: changeReason }),
});
