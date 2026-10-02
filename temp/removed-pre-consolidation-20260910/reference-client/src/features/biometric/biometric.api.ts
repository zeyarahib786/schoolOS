import { apiClient, ApiSuccess } from '../../lib/api/client';

export interface BiometricDevice {
  _id: string;
  name: string;
  location: string;
  status: 'Online' | 'Offline';
  lastSyncAt?: string;
}

export async function listDevices(): Promise<BiometricDevice[]> {
  const res = await apiClient.get<ApiSuccess<BiometricDevice[]>>('/biometric');
  return res.data.data;
}

export async function createDevice(input: { name: string; location: string }): Promise<BiometricDevice> {
  const res = await apiClient.post<ApiSuccess<BiometricDevice>>('/biometric', input);
  return res.data.data;
}

export async function syncDevice(id: string): Promise<BiometricDevice> {
  const res = await apiClient.post<ApiSuccess<BiometricDevice>>(`/biometric/${id}/sync`);
  return res.data.data;
}
