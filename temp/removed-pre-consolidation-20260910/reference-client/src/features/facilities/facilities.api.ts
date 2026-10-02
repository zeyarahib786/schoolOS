import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface Booking {
  _id: string;
  facility: { _id: string; name: string; type: string } | string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
}
export interface Facility{_id:string;name:string;type:string;capacity:number}
export interface CreateBookingInput{facilityId:string;date:string;startTime:string;endTime:string;purpose:string}
export interface CreateFacilityInput{name:string;type:string;capacity:number}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listBookings(page = 1): Promise<Paginated<Booking>> {
  const res = await apiClient.get<ApiSuccess<Booking[]>>('/facilities/bookings', { params: { page, limit: 20 } });
  const pagination = res.data.meta?.pagination ?? { page, limit: 20, total: res.data.data.length, totalPages: 1 };
  return { items: res.data.data, ...pagination };
}
export async function listFacilities():Promise<Facility[]>{const res=await apiClient.get<ApiSuccess<Facility[]>>('/facilities/facilities');return res.data.data;}
export async function createFacility(input:CreateFacilityInput):Promise<Facility>{const res=await apiClient.post<ApiSuccess<Facility>>('/facilities/facilities',input);return res.data.data;}
export async function createBooking(input:CreateBookingInput):Promise<Booking>{const res=await apiClient.post<ApiSuccess<Booking>>('/facilities/bookings',input);return res.data.data;}
