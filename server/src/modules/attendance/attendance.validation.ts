import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const isoDate = z
  .string()
  .refine(
    (v) =>
      /^\d{4}-\d{2}-\d{2}/.test(v) &&
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v.slice(0, 10),
    'Invalid calendar date',
  );

export const listAttendanceSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    studentId: objectId.optional(),
    dateFrom: isoDate.optional(),
    dateTo: isoDate.optional(),
    session: z.enum(['AM', 'PM']).optional(),
    status: z.enum(['Present', 'Absent', 'Late', 'Excused']).optional(),
  }),
  params: z.object({}).optional(),
});

/** A single entry within a bulk mark - one row per student in a class being marked together,
 * matching how attendance is actually taken (a teacher marks a whole class in one sitting, not
 * one student at a time). */
const attendanceEntrySchema = z.object({
  studentId: objectId,
  status: z.enum(['Present', 'Absent', 'Late', 'Excused']),
  notes: z.string().trim().max(300).optional(),
});

export const markAttendanceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    date: isoDate,
    session: z.enum(['AM', 'PM']),
    entries: z
      .array(attendanceEntrySchema)
      .min(1, 'At least one student is required')
      .max(200, 'Too many entries in a single request'),
  }),
});

export const listStaffAttendanceSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    date: isoDate.optional(),
  }),
  params: z.object({}).optional(),
});

export const markStaffAttendanceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    date: isoDate.optional(),
    status: z.enum(['Present', 'Remote', 'Late']),
  }),
});

export const listAbsenceRequestsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    studentId: objectId.optional(),
    status: z.enum(['Pending', 'Approved', 'Rejected', 'Cancelled']).optional(),
  }),
  params: z.object({}).optional(),
});

export const createAbsenceRequestSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    studentId: objectId,
    fromDate: isoDate,
    toDate: isoDate,
    type: z.enum(['Medical', 'Family event', 'Travel', 'Religious observance', 'Other']).default('Other'),
    note: z.string().trim().min(1).max(400),
  }),
});

export const absenceRequestIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export const decideAbsenceRequestSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    decision: z.enum(['Approved', 'Rejected']),
    note: z.string().trim().max(300).optional(),
  }),
});

export type ListAttendanceQuery = z.infer<typeof listAttendanceSchema>['query'];
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>['body'];
export type ListStaffAttendanceQuery = z.infer<typeof listStaffAttendanceSchema>['query'];
export type MarkStaffAttendanceInput = z.infer<typeof markStaffAttendanceSchema>['body'];
export type ListAbsenceRequestsQuery = z.infer<typeof listAbsenceRequestsSchema>['query'];
export type CreateAbsenceRequestInput = z.infer<typeof createAbsenceRequestSchema>['body'];
export type DecideAbsenceRequestInput = z.infer<typeof decideAbsenceRequestSchema>['body'];

export const saveRegisterSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
        'Invalid calendar date',
      ),
    session: z.enum(['AM', 'PM']),
    entries: z
      .array(attendanceEntrySchema.extend({ expectedUpdatedAt: z.string().datetime().nullable() }))
      .min(1)
      .max(200),
    notifyGuardians: z.boolean().default(false),
    notificationChannel: z.enum(['InApp', 'Email', 'SMS']).default('InApp'),
    correctionReason: z.string().trim().max(300).optional(),
  }),
});
export type SaveRegisterInput = z.infer<typeof saveRegisterSchema>['body'];
