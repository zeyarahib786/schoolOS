import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const stopSchema = z.object({ name: z.string().trim().min(1).max(160), address: z.string().trim().max(240).optional(), pincode: z.string().trim().max(30).optional(), time: z.string().trim().max(20).optional(), lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional() });

export const createVehicleSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    regNumber: z.string().trim().min(1).max(30),
    capacity: z.number().int().positive(),
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
    stops: z.array(z.union([z.string().trim().min(1).max(160), stopSchema])).min(1, 'A route needs at least one stop').transform((stops) => stops.map((stop) => typeof stop === 'string' ? { name: stop } : stop)),
    gpsId: z.string().trim().max(60).optional(),
  }),
});

export const routeOperationalStatusSchema = z.object({ query: z.object({}).optional(), params: z.object({ id: objectId }), body: z.object({ status: z.enum(['Depot', 'On road', 'Delayed']) }) });
export const vehicleMaintenanceSchema = z.object({ query: z.object({}).optional(), params: z.object({ id: objectId }), body: z.object({ status: z.literal('Maintenance') }) });
export const createIncidentSchema = z.object({ query: z.object({}).optional(), params: z.object({ id: objectId }), body: z.object({ type: z.enum(['Mechanical issue', 'Traffic delay', 'Accident (minor)', 'Student behaviour', 'Route deviation']), severity: z.enum(['Minor', 'Moderate', 'Serious']).default('Minor'), location: z.string().trim().max(200).optional(), description: z.string().trim().min(2).max(1000) }) });
export const listIncidentsSchema = z.object({ body: z.object({}).optional(), params: z.object({}).optional(), query: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(['Open', 'Resolved']).optional() }) });

export const assignStudentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({ studentId: objectId }),
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
  }),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>['body'];
export type CreateRouteInput = z.infer<typeof createRouteSchema>['body'];
export type ListRoutesQuery = z.infer<typeof listRoutesSchema>['query'];
export type RouteOperationalStatusInput = z.infer<typeof routeOperationalStatusSchema>['body'];
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>['body'];
export type ListIncidentsQuery = z.infer<typeof listIncidentsSchema>['query'];
