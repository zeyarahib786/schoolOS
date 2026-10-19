import mongoose, { ClientSession } from 'mongoose';
import { Vehicle } from '../../models/Vehicle';
import { Route } from '../../models/Route';
import { Student } from '../../models/Student';
import { TransportIncident } from '../../models/TransportIncident';
import { schoolToday } from '../attendance/attendance.dates';
import { z } from 'zod';
import {
  reviewVehicleSchema,
  reviewRouteSchema,
  removeStudentSchema,
  reviewIncidentSchema,
} from './transport.validation';
import { ApiError } from '../../utils/ApiError';
import { IVehicle } from '../../models/Vehicle';
import { IRoute } from '../../models/Route';
import * as repo from './transport.repository';
import {
  CreateVehicleInput,
  CreateRouteInput,
  ListRoutesQuery,
  RouteOperationalStatusInput,
  CreateIncidentInput,
  ListIncidentsQuery,
} from './transport.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeRouteFilter, canManageTransport } from './transport.ownership';
import { logAudit } from '../audit/audit.service';

export async function addVehicle(input: CreateVehicleInput, requester: AuthenticatedUser): Promise<IVehicle> {
  if (!canManageTransport(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may add a vehicle');
  try {
    const vehicle = await repo.createVehicle(input);
    await logAudit(`Added transport vehicle ${vehicle.regNumber}`, 'Transport', requester.id);
    return vehicle;
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw ApiError.conflict('A vehicle with this registration number already exists');
    throw error;
  }
}

export async function listVehicles(user: AuthenticatedUser) {
  if (canManageTransport(user.role)) return repo.findVehicles();
  const ids = await repo.findAuthorizedStudentIds(user.id, user.role),
    routes = await Route.find({ assignedStudents: { $in: ids } }).select('vehicle');
  return Vehicle.find({ _id: { $in: routes.map((r) => r.vehicle) } })
    .select('-history')
    .sort({ regNumber: 1 });
}
export async function addRoute(input: CreateRouteInput, user: AuthenticatedUser): Promise<IRoute> {
  if (!canManageTransport(user.role)) throw ApiError.forbidden('Only transport staff may add a route');
  const session = await mongoose.startSession();
  let created: IRoute | undefined;
  try {
    await session.withTransaction(async () => {
      const vehicle = await vehicleLock(input.vehicleId, session);
      if (vehicle.status === 'Maintenance') throw ApiError.conflict('Vehicle is in maintenance');
      if (await Route.exists({ vehicle: input.vehicleId, archived: { $ne: true } }).session(session))
        throw ApiError.conflict('Vehicle already has an active route');
      [created] = await Route.create(
        [{ name: input.name, vehicle: input.vehicleId, stops: input.stops, gpsId: input.gpsId }],
        { session },
      );
    });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw ApiError.conflict('Route name already exists');
    throw e;
  } finally {
    await session.endSession();
  }
  if (!created) throw ApiError.conflict('Route could not be saved');
  await logAudit('Added transport route ' + created.name, 'Transport', user.id);
  return created;
}
async function vehicleLock(id: string, session: ClientSession) {
  const vehicle = await Vehicle.findOneAndUpdate({ _id: id }, { $inc: { __v: 1 } }, { new: true, session });
  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  return vehicle;
}

export async function listRoutes(query: ListRoutesQuery, requester: AuthenticatedUser) {
  const authorizedStudentIds =
    requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Teacher'
      ? []
      : await repo.findAuthorizedStudentIds(requester.id, requester.role);

  const { items, total } = await repo.findManyRoutes(query, (base) =>
    scopeRouteFilter(base, requester, authorizedStudentIds),
  );
  return {
    items: canManageTransport(requester.role)
      ? items
      : items.map((r) => ({
          ...r.toObject(),
          history: [],
          assignedStudents: (r.assignedStudents as unknown as Array<{ _id: { toString(): string } }>).filter((s) =>
            authorizedStudentIds.some((id) => id.toString() === s._id.toString()),
          ),
          studentStops: (r.studentStops || []).filter((s) => authorizedStudentIds.some((id) => id.equals(s.student))),
        })),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function assignStudent(
  routeId: string,
  studentId: string,
  user: AuthenticatedUser,
  stopName?: string,
): Promise<IRoute> {
  if (!canManageTransport(user.role)) throw ApiError.forbidden('Only transport staff may assign a student');
  const session = await mongoose.startSession();
  let saved: IRoute | undefined;
  try {
    await session.withTransaction(async () => {
      const route = await Route.findById(routeId).session(session);
      if (!route) throw ApiError.notFound('Route not found');
      if (route.archived) throw ApiError.conflict('Restore the route before assigning riders');
      const vehicle = await vehicleLock(route.vehicle.toString(), session);
      if (vehicle.status === 'Maintenance') throw ApiError.conflict('Vehicle is in maintenance');
      const student = await Student.findOneAndUpdate({ _id: studentId }, { $inc: { __v: 1 } }, { new: true, session });
      if (!student) throw ApiError.notFound('Student not found');
      if (student.status !== 'Active') throw ApiError.conflict('Only active students can use transport');
      if (route.assignedStudents.map(String).includes(studentId)) {
        saved = route;
        return;
      }
      if (await Route.exists({ _id: { $ne: routeId }, assignedStudents: studentId }).session(session))
        throw ApiError.conflict('Student already has another route');
      if (route.assignedStudents.length >= vehicle.capacity) throw ApiError.conflict('Route is at full capacity');
      const stop = stopName || route.stops[0].name;
      if (!route.stops.some((s) => s.name === stop)) throw ApiError.badRequest('Choose a saved route stop');
      saved =
        (await Route.findByIdAndUpdate(
          routeId,
          {
            $addToSet: { assignedStudents: studentId },
            $push: {
              studentStops: { student: studentId, stopName: stop },
              history: { at: new Date(), actor: user.id, action: 'Assigned rider', student: studentId },
            },
          },
          { new: true, session },
        )) || undefined;
    });
  } finally {
    await session.endSession();
  }
  if (!saved) throw ApiError.conflict('Assignment could not be saved');
  await logAudit('Assigned transport student ' + studentId, 'Transport', user.id);
  return saved;
}
export async function setRouteOperationalStatus(
  id: string,
  input: RouteOperationalStatusInput,
  user: AuthenticatedUser,
): Promise<IRoute> {
  if (!canManageTransport(user.role)) throw ApiError.forbidden('Only transport staff may update operations');
  const session = await mongoose.startSession();
  let saved: IRoute | undefined;
  try {
    await session.withTransaction(async () => {
      const route = await Route.findById(id).session(session);
      if (!route) throw ApiError.notFound('Route not found');
      const vehicle = await vehicleLock(route.vehicle.toString(), session);
      if (input.status !== 'Depot') {
        if (route.archived || vehicle.status === 'Maintenance')
          throw ApiError.conflict('Archived or maintenance route cannot be on the road');
        const today = await schoolToday();
        if (
          [vehicle.insuranceExpiry, vehicle.driverLicenseExpiry].some((d) => d && d.toISOString().slice(0, 10) < today)
        )
          throw ApiError.conflict('Configured insurance or driver licence expiry has passed');
      }
      saved =
        (await Route.findOneAndUpdate(
          { _id: id, updatedAt: new Date(input.expectedUpdatedAt) },
          {
            $set: { status: input.status },
            $push: {
              history: {
                at: new Date(),
                actor: user.id,
                action: 'Operational status',
                status: input.status,
                reason: input.reason,
              },
            },
          },
          { new: true, session },
        )) || undefined;
      if (!saved) throw ApiError.conflict('Route changed; refresh before saving');
    });
  } finally {
    await session.endSession();
  }
  if (!saved) throw ApiError.conflict('Operation could not be saved');
  await logAudit('Updated route operation ' + id, 'Transport', user.id);
  return saved;
}
export async function scheduleVehicleMaintenance(
  id: string,
  user: AuthenticatedUser,
  input: z.infer<typeof reviewVehicleSchema>['body'],
): Promise<IVehicle> {
  return reviewVehicle(id, { ...input, status: 'Maintenance' }, user);
}
export async function reviewVehicle(
  id: string,
  input: z.infer<typeof reviewVehicleSchema>['body'],
  user: AuthenticatedUser,
): Promise<IVehicle> {
  const session = await mongoose.startSession();
  let saved: IVehicle | undefined;
  const { expectedUpdatedAt, reason, ...changes } = input;
  try {
    await session.withTransaction(async () => {
      const current = await Vehicle.findById(id).session(session);
      if (!current) throw ApiError.notFound('Vehicle not found');
      const routes = await Route.find({ vehicle: id, archived: { $ne: true } }).session(session);
      if (changes.capacity !== undefined && routes.some((r) => r.assignedStudents.length > changes.capacity!))
        throw ApiError.conflict('Capacity cannot be less than assigned riders');
      saved =
        (await Vehicle.findOneAndUpdate(
          { _id: id, updatedAt: new Date(expectedUpdatedAt) },
          { $set: changes, $inc: { __v: 1 }, $push: { history: { at: new Date(), actor: user.id, reason } } },
          { new: true, session, runValidators: true },
        )) || undefined;
      if (!saved) throw ApiError.conflict('Vehicle changed; refresh before saving');
      if (changes.status === 'Maintenance')
        await Route.updateMany(
          { vehicle: id },
          {
            $set: { status: 'Depot' },
            $push: {
              history: { at: new Date(), actor: user.id, action: 'Maintenance depot', status: 'Depot', reason },
            },
          },
          { session },
        );
    });
  } finally {
    await session.endSession();
  }
  if (!saved) throw ApiError.conflict('Vehicle could not be saved');
  await logAudit('Reviewed vehicle ' + id, 'Transport', user.id);
  return saved;
}
export async function reviewRoute(
  id: string,
  input: z.infer<typeof reviewRouteSchema>['body'],
  user: AuthenticatedUser,
) {
  const session = await mongoose.startSession();
  let saved;
  const { expectedUpdatedAt, reason, vehicleId, ...changes } = input;
  try {
    await session.withTransaction(async () => {
      const current = await Route.findById(id).session(session);
      if (!current) throw ApiError.notFound('Route not found');
      const vehicle = await vehicleLock(vehicleId || current.vehicle.toString(), session);
      if (current.status !== 'Depot') throw ApiError.conflict('Return the route to depot before editing its plan');
      if (changes.archived && current.assignedStudents.length)
        throw ApiError.conflict('Remove riders before archiving');
      if (vehicleId && vehicleId !== current.vehicle.toString() && vehicle.status === 'Maintenance')
        throw ApiError.conflict('Replacement vehicle is in maintenance');
      if (vehicle.capacity < current.assignedStudents.length)
        throw ApiError.conflict('Vehicle capacity is below assigned riders');
      if (
        (changes.archived === false || (vehicleId && vehicleId !== current.vehicle.toString())) &&
        (await Route.exists({
          _id: { $ne: id },
          vehicle: vehicleId || current.vehicle,
          archived: { $ne: true },
        }).session(session))
      )
        throw ApiError.conflict('Vehicle already has another route');
      if (changes.stops && current.studentStops.some((s) => !changes.stops!.some((stop) => stop.name === s.stopName)))
        throw ApiError.conflict('Reassign riders before removing their stop');
      saved = await Route.findOneAndUpdate(
        { _id: id, updatedAt: new Date(expectedUpdatedAt) },
        {
          $set: { ...changes, ...(vehicleId ? { vehicle: vehicleId } : {}) },
          $push: {
            history: {
              at: new Date(),
              actor: user.id,
              action: changes.archived ? 'Archived' : changes.archived === false ? 'Restored' : 'Plan reviewed',
              reason,
            },
          },
        },
        { new: true, session, runValidators: true },
      );
      if (!saved) throw ApiError.conflict('Route changed; refresh before saving');
    });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw ApiError.conflict('Route name already exists');
    throw e;
  } finally {
    await session.endSession();
  }
  await logAudit('Reviewed route ' + id, 'Transport', user.id);
  return saved;
}
export async function removeStudent(
  id: string,
  input: z.infer<typeof removeStudentSchema>['body'],
  user: AuthenticatedUser,
) {
  const session = await mongoose.startSession();
  let saved;
  try {
    await session.withTransaction(async () => {
      await Student.updateOne({ _id: input.studentId }, { $inc: { __v: 1 } }, { session });
      saved = await Route.findOneAndUpdate(
        { _id: id, updatedAt: new Date(input.expectedUpdatedAt), assignedStudents: input.studentId },
        {
          $pull: { assignedStudents: input.studentId, studentStops: { student: input.studentId } },
          $push: {
            history: {
              at: new Date(),
              actor: user.id,
              action: 'Removed rider',
              student: input.studentId,
              reason: input.reason,
            },
          },
        },
        { new: true, session },
      );
      if (!saved) throw ApiError.conflict('Route changed or rider is not assigned');
    });
  } finally {
    await session.endSession();
  }
  await logAudit('Removed transport rider ' + input.studentId, 'Transport', user.id);
  return saved;
}
export async function reviewIncident(
  id: string,
  input: z.infer<typeof reviewIncidentSchema>['body'],
  user: AuthenticatedUser,
) {
  const { expectedUpdatedAt, reason, ...changes } = input;
  const saved = await TransportIncident.findOneAndUpdate(
    { _id: id, updatedAt: new Date(expectedUpdatedAt) },
    {
      $set: { ...changes, resolvedAt: changes.status === 'Resolved' ? new Date() : null },
      $push: { history: { at: new Date(), actor: user.id, status: changes.status, reason } },
    },
    { new: true, runValidators: true },
  );
  if (!saved) throw ApiError.conflict('Incident changed; refresh before review');
  await logAudit('Reviewed transport incident ' + id, 'Transport', user.id);
  return saved;
}

export async function reportIncident(
  routeId: string,
  input: CreateIncidentInput,
  requester: AuthenticatedUser,
): Promise<import('../../models/TransportIncident').ITransportIncident> {
  if (!canManageTransport(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may report an incident');
  const route = await repo.findRouteById(routeId);
  if (!route) throw ApiError.notFound('Route not found');
  if (input.occurredAt && new Date(input.occurredAt) > new Date())
    throw ApiError.badRequest('Incident cannot be in the future');
  const incident = await repo.createIncident(routeId, input, requester.id);
  await logAudit(
    `Reported ${input.severity} transport incident on ${route.name}: ${input.type}`,
    'Transport',
    requester.id,
    input.severity === 'Serious' ? 'Critical' : 'Warning',
  );
  return incident;
}

export async function listIncidents(query: ListIncidentsQuery, requester: AuthenticatedUser) {
  if (!canManageTransport(requester.role))
    return { items: [], pagination: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
  const { items, total } = await repo.findManyIncidents(query);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}
