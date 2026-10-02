import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface TimetableSlot {
  _id: string;
  grade: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  periodNumber: number;
  subject: string;
  teacherName: string;
  room?: string;
  isSubstitute: boolean;
  status: 'Draft' | 'Published';
  createdAt: string;
  updatedAt: string;
}

export async function listSlots(): Promise<TimetableSlot[]> {
  const res = await apiClient.get<ApiSuccess<TimetableSlot[]>>('/timetable');
  return res.data.data;
}

export type CreateTimetableSlotInput = Omit<
  TimetableSlot,
  '_id' | 'status' | 'isSubstitute' | 'createdAt' | 'updatedAt'
>;

export async function createSlot(input: CreateTimetableSlotInput): Promise<TimetableSlot> {
  const res = await apiClient.post<ApiSuccess<TimetableSlot>>('/timetable', input);
  return res.data.data;
}

export type UpdateTimetableSlotInput = Partial<
  Pick<TimetableSlot, 'subject' | 'teacherName' | 'room' | 'isSubstitute'>
>;

export async function updateSlot(id: string, input: UpdateTimetableSlotInput): Promise<TimetableSlot> {
  const res = await apiClient.patch<ApiSuccess<TimetableSlot>>(`/timetable/${id}`, input);
  return res.data.data;
}

export async function removeSlot(id: string): Promise<void> {
  await apiClient.delete(`/timetable/${id}`);
}

export async function publishGrade(grade: string): Promise<void> {
  await apiClient.post('/timetable/publish', { grade });
}

export interface TimetablePosition {
  dayOfWeek: TimetableSlot['dayOfWeek'];
  periodNumber: number;
}

export async function swapSlots(
  grade: string,
  source: TimetablePosition,
  target: TimetablePosition,
): Promise<TimetableSlot[]> {
  const res = await apiClient.post<ApiSuccess<TimetableSlot[]>>('/timetable/swap', {
    grade,
    source,
    target,
  });
  return res.data.data;
}
