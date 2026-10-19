import { z } from 'zod';

import { calendarDateSchema } from '../../utils/calendarDate';
const version = z.string().datetime(),
  reason = z.string().trim().min(3).max(500);
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const stopSchema = z.object({
  name: z.string().trim().min(1).max(160),
  address: z.string().trim().max(240).optional(),
  pincode: z.string().trim().max(30).optional(),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm')
    .optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const createVehicleSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    regNumber: z.string().trim().min(1).max(30),
    capacity: z.number().int().positive().max(200),
    insuranceExpiry: calendarDateSchema.nullable().optional(),
    driverLicenseExpiry: calendarDateSchema.nullable().optional(),
    driverName: z.string().trim().min(2).max(120),
    driverPhone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ]{7,20}$/, 'Invalid phone number'),
  }),
});

export const createRouteSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().trim().min(1).max(120),
    vehicleId: objectId,
    stops: z
      .array(z.union([z.string().trim().min(1).max(160), stopSchema]))
      .min(1, 'A route needs at least one stop')
      .transform((stops) => stops.map((stop) => (typeof stop === 'string' ? { name: stop } : stop)))
      .refine((stops) => new Set(stops.map((s) => s.name)).size === stops.length, 'Stop names must be unique'),
    gpsId: z.string().trim().max(60).optional(),
  }),
});

export const routeOperationalStatusSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({ status: z.enum(['Depot', 'On road', 'Delayed']), expectedUpdatedAt: version, reason }),
});
export const vehicleMaintenanceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({ status: z.literal('Maintenance'), expectedUpdatedAt: version, reason }),
});
export const createIncidentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    type: z.enum(['Mechanical issue', 'Traffic delay', 'Accident (minor)', 'Student behaviour', 'Route deviation']),
    severity: z.enum(['Minor', 'Moderate', 'Serious']).default('Minor'),
    location: z.string().trim().max(200).optional(),
    occurredAt: z.string().datetime({ offset: true }).optional(),
    description: z.string().trim().min(2).max(1000),
  }),
});
export const listIncidentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['Open', 'Resolved']).optional(),
  }),
});

export const assignStudentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({ studentId: objectId, stopName: z.string().trim().min(1).max(160).optional() }),
});

export const routeIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export const listRoutesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    archived: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  }),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>['body'];
export type CreateRouteInput = z.infer<typeof createRouteSchema>['body'];
export type ListRoutesQuery = z.infer<typeof listRoutesSchema>['query'];
export type RouteOperationalStatusInput = z.infer<typeof routeOperationalStatusSchema>['body'];
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>['body'];
export type ListIncidentsQuery = z.infer<typeof listIncidentsSchema>['query'];

export const reviewVehicleSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
  body: createVehicleSchema.shape.body
    .partial()
    .extend({ status: z.enum(['Available', 'Maintenance']).optional(), expectedUpdatedAt: version, reason }),
});
export const reviewRouteSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
  body: createRouteSchema.shape.body
    .partial()
    .extend({ archived: z.boolean().optional(), expectedUpdatedAt: version, reason }),
});
export const removeStudentSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
  body: z.object({ studentId: objectId, expectedUpdatedAt: version, reason }),
});
export const reviewIncidentSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
  body: z.object({
    status: z.enum(['Open', 'Resolved']),
    resolution: z.string().trim().min(3).max(1000),
    expectedUpdatedAt: version,
    reason,
  }),
});
