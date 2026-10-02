import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface TimetableSlot {
  _id: string;
  grade: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  periodNumber: number;
  subject: string;
  teacherName: string;
}

export async function listSlots(): Promise<TimetableSlot[]> {
  const res = await apiClient.get<ApiSuccess<TimetableSlot[]>>('/timetable');
  return res.data.data;
}

export type CreateTimetableSlotInput = Omit<TimetableSlot, '_id'>;

export async function createSlot(input: CreateTimetableSlotInput): Promise<TimetableSlot> {
  const res = await apiClient.post<ApiSuccess<TimetableSlot>>('/timetable', input);
  return res.data.data;
}
