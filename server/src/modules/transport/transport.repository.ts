import { FilterQuery } from 'mongoose';
import { Vehicle, IVehicle } from '../../models/Vehicle';
import { Route, IRoute } from '../../models/Route';
import { Student } from '../../models/Student';
import { TransportIncident, ITransportIncident } from '../../models/TransportIncident';
import { CreateVehicleInput, CreateRouteInput, ListRoutesQuery, ListIncidentsQuery } from './transport.validation';

export function createVehicle(input: CreateVehicleInput): Promise<IVehicle> {
  return Vehicle.create(input);
}

export function findVehicleById(id: string): Promise<IVehicle | null> {
  return Vehicle.findById(id);
}

export function findVehicles(): Promise<IVehicle[]> {
  return Vehicle.find().sort({ regNumber: 1 });
}

export async function findManyRoutes(
  query: ListRoutesQuery,
  applyOwnershipScope: (base: FilterQuery<IRoute>) => FilterQuery<IRoute>,
): Promise<{ items: IRoute[]; total: number }> {
  const filter = applyOwnershipScope({ archived: query.archived ? true : { $ne: true } });
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Route.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(query.limit)
      .populate('vehicle', 'regNumber capacity driverName driverPhone status insuranceExpiry driverLicenseExpiry')
      .populate('assignedStudents', 'name refId grade'),
    Route.countDocuments(filter),
  ]);
  return { items, total };
}

export function findRouteById(id: string): Promise<IRoute | null> {
  return Route.findById(id);
}

export function findRouteByVehicle(vehicleId: string): Promise<IRoute | null> {
  return Route.findOne({ vehicle: vehicleId });
}

export function findRouteForStudent(studentId: string, excludingRouteId: string): Promise<IRoute | null> {
  return Route.findOne({ _id: { $ne: excludingRouteId }, assignedStudents: studentId });
}

export function findStudentById(id: string) {
  return Student.findById(id);
}

export function createRoute(input: CreateRouteInput): Promise<IRoute> {
  return Route.create({
    name: input.name,
    vehicle: input.vehicleId,
    stops: input.stops,
    gpsId: input.gpsId,
    assignedStudents: [],
  });
}

export function setRouteOperationalStatus(id: string, status: 'Depot' | 'On road' | 'Delayed'): Promise<IRoute | null> {
  return Route.findByIdAndUpdate(id, { status }, { new: true });
}

export async function markVehicleMaintenance(id: string): Promise<IVehicle | null> {
  const vehicle = await Vehicle.findByIdAndUpdate(id, { status: 'Maintenance' }, { new: true });
  if (vehicle) await Route.updateMany({ vehicle: id }, { status: 'Depot' });
  return vehicle;
}

export function createIncident(
  route: string,
  input: { type: string; severity: string; location?: string; description: string; occurredAt?: string },
  reportedBy: string,
): Promise<ITransportIncident> {
  return TransportIncident.create({
    route,
    type: input.type,
    severity: input.severity,
    location: input.location,
    description: input.description,
    occurredAt: input.occurredAt,
    reportedBy,
  });
}

export async function findManyIncidents(
  query: ListIncidentsQuery,
): Promise<{ items: ITransportIncident[]; total: number }> {
  const filter: FilterQuery<ITransportIncident> = query.status ? { status: query.status } : {};
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    TransportIncident.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).populate('route', 'name'),
    TransportIncident.countDocuments(filter),
  ]);
  return { items, total };
}

/**
 * The real capacity-safety mechanism: assignment and the capacity check happen in a SINGLE
 * atomic update, using `$expr` to compare the current array size against the vehicle's capacity
 * (passed in as an already-resolved number, since MongoDB can't join across collections inside a
 * single document's own update filter). `$addToSet` (not `$push`) also makes double-assigning
 * the same student to the same route a genuine no-op rather than a duplicate entry - a route's
 * seat is either taken by a student or it isn't, there's no meaningful "assigned twice." If two
 * concurrent requests both try to claim the LAST seat, the array-size condition in the filter
 * means only one `findOneAndUpdate` can match and succeed; the other gets null back, the same
 * "loser gets null, not a corrupted write" pattern Library's atomic decrement relies on.
 */
export function assignStudentIfCapacityAvailable(
  routeId: string,
  studentId: string,
  capacity: number,
): Promise<IRoute | null> {
  return Route.findOneAndUpdate(
    { _id: routeId, $expr: { $lt: [{ $size: '$assignedStudents' }, capacity] } },
    { $addToSet: { assignedStudents: studentId } },
    { new: true },
  );
}

export function findAuthorizedStudentIds(userId: string, role: string) {
  return Student.find(
    role === 'Student'
      ? { studentUserId: userId }
      : role === 'Parent'
        ? { guardianUserId: userId }
        : { _id: { $in: [] } },
  )
    .select('_id')
    .then((students) => students.map((s) => s._id));
}
