import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface RouteItem {
  _id: string;
  name: string;
  vehicle: { _id: string; regNumber: string; capacity: number; driverName: string } | string;
  stops: string[];
  assignedStudents: { _id: string; name: string; refId: string }[] | string[];
}

export interface Vehicle {
  _id: string;
  regNumber: string;
  capacity: number;
  driverName: string;
  driverPhone: string;
}

export interface CreateVehicleInput { regNumber: string; capacity: number; driverName: string; driverPhone: string }
export interface CreateRouteInput { name: string; vehicleId: string; stops: string[] }

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listRoutes(page = 1): Promise<Paginated<RouteItem>> {
  const res = await apiClient.get<ApiSuccess<RouteItem[]>>('/transport/routes', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}

export async function listVehicles(): Promise<Vehicle[]> {
  const res = await apiClient.get<ApiSuccess<Vehicle[]>>('/transport/vehicles');
  return res.data.data;
}

export async function createVehicle(input: CreateVehicleInput): Promise<Vehicle> {
  const res = await apiClient.post<ApiSuccess<Vehicle>>('/transport/vehicles', input);
  return res.data.data;
}

export async function createRoute(input: CreateRouteInput): Promise<RouteItem> {
  const res = await apiClient.post<ApiSuccess<RouteItem>>('/transport/routes', input);
  return res.data.data;
}

export async function assignStudent(routeId: string, studentId: string): Promise<RouteItem> {
  const res = await apiClient.post<ApiSuccess<RouteItem>>(`/transport/routes/${routeId}/assign`, { studentId });
  return res.data.data;
}
