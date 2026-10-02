import { ApiError } from '../../utils/ApiError';
import { IVehicle } from '../../models/Vehicle';
import { IRoute } from '../../models/Route';
import * as repo from './transport.repository';
import { CreateVehicleInput, CreateRouteInput, ListRoutesQuery, RouteOperationalStatusInput, CreateIncidentInput, ListIncidentsQuery } from './transport.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeRouteFilter, canManageTransport } from './transport.ownership';
import { logAudit } from '../audit/audit.service';

export async function addVehicle(input: CreateVehicleInput, requester: AuthenticatedUser): Promise<IVehicle> {
  if (!canManageTransport(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may add a vehicle');
  try { const vehicle = await repo.createVehicle(input); await logAudit(`Added transport vehicle ${vehicle.regNumber}`, 'Transport', requester.id); return vehicle; }
  catch (error) { if ((error as { code?: number }).code === 11000) throw ApiError.conflict('A vehicle with this registration number already exists'); throw error; }
}

export function listVehicles(): Promise<IVehicle[]> {
  return repo.findVehicles();
}

export async function addRoute(input: CreateRouteInput, requester: AuthenticatedUser): Promise<IRoute> {
  if (!canManageTransport(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may add a route');
  const vehicle = await repo.findVehicleById(input.vehicleId);
  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  if (vehicle.status === 'Maintenance') throw ApiError.conflict('A vehicle in maintenance cannot be assigned to a route');
  if (await repo.findRouteByVehicle(input.vehicleId)) throw ApiError.conflict('This vehicle is already assigned to another route');
  try { const route = await repo.createRoute(input); await logAudit(`Added transport route ${route.name}`, 'Transport', requester.id); return route; }
  catch (error) { if ((error as { code?: number }).code === 11000) throw ApiError.conflict('A route with this name already exists'); throw error; }
}

export async function listRoutes(query: ListRoutesQuery, requester: AuthenticatedUser) {
  const authorizedStudentIds =
    requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Teacher'
      ? []
      : await repo.findAuthorizedStudentIds(requester.id);

  const { items, total } = await repo.findManyRoutes(query, (base) =>
    scopeRouteFilter(base, requester, authorizedStudentIds),
  );
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function assignStudent(routeId: string, studentId: string, requester: AuthenticatedUser): Promise<IRoute> {
  if (!canManageTransport(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may assign a student to a route');

  const route = await repo.findRouteById(routeId);
  if (!route) throw ApiError.notFound('Route not found');
  const vehicle = await repo.findVehicleById(route.vehicle.toString());
  if (!vehicle) throw ApiError.notFound('Vehicle for this route not found');
  if (vehicle.status === 'Maintenance') throw ApiError.conflict('This vehicle is in maintenance');
  const student = await repo.findStudentById(studentId);
  if (!student) throw ApiError.notFound('Student not found');
  if (student.status !== 'Active') throw ApiError.conflict('Only active students can be assigned to transport');
  if (!(route.assignedStudents.map(String).includes(studentId)) && await repo.findRouteForStudent(studentId, routeId)) throw ApiError.conflict('Student is already assigned to another transport route');

  const updated = await repo.assignStudentIfCapacityAvailable(routeId, studentId, vehicle.capacity);
  if (!updated) throw ApiError.conflict('This route is at full capacity - no seats available');
  await logAudit(`Assigned student ${student.refId} to transport route ${route.name}`, 'Transport', requester.id);
  return updated;
}

export async function setRouteOperationalStatus(routeId: string, input: RouteOperationalStatusInput, requester: AuthenticatedUser): Promise<IRoute> {
  if (!canManageTransport(requester.role)) throw ApiError.forbidden('Only Administrator, Principal, or Teacher may update route operations');
  const route = await repo.findRouteById(routeId); if (!route) throw ApiError.notFound('Route not found');
  const vehicle = await repo.findVehicleById(route.vehicle.toString()); if (!vehicle) throw ApiError.notFound('Vehicle for this route not found');
  if (input.status !== 'Depot' && vehicle.status === 'Maintenance') throw ApiError.conflict('A vehicle in maintenance cannot be put on the road');
  const updated = await repo.setRouteOperationalStatus(routeId, input.status); if (!updated) throw ApiError.notFound('Route not found');
  await logAudit(`Set transport route ${route.name} to ${input.status}`, 'Transport', requester.id, input.status === 'Delayed' ? 'Warning' : 'Info'); return updated;
}

export async function scheduleVehicleMaintenance(vehicleId: string, requester: AuthenticatedUser): Promise<IVehicle> {
  if (!canManageTransport(requester.role)) throw ApiError.forbidden('Only Administrator, Principal, or Teacher may schedule vehicle maintenance');
  const vehicle = await repo.markVehicleMaintenance(vehicleId); if (!vehicle) throw ApiError.notFound('Vehicle not found');
  await logAudit(`Scheduled maintenance for transport vehicle ${vehicle.regNumber}`, 'Transport', requester.id, 'Warning'); return vehicle;
}

export async function reportIncident(routeId: string, input: CreateIncidentInput, requester: AuthenticatedUser): Promise<import('../../models/TransportIncident').ITransportIncident> {
  if (!canManageTransport(requester.role)) throw ApiError.forbidden('Only Administrator, Principal, or Teacher may report an incident');
  const route = await repo.findRouteById(routeId); if (!route) throw ApiError.notFound('Route not found');
  const incident = await repo.createIncident(routeId, input, requester.id);
  await logAudit(`Reported ${input.severity} transport incident on ${route.name}: ${input.type}`, 'Transport', requester.id, input.severity === 'Serious' ? 'Critical' : 'Warning'); return incident;
}

export async function listIncidents(query: ListIncidentsQuery, requester: AuthenticatedUser) {
  if (!canManageTransport(requester.role)) return { items: [], pagination: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
  const { items, total } = await repo.findManyIncidents(query);
  return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}
