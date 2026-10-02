import { ApiError } from '../../utils/ApiError';
import { IBiometricDevice } from '../../models/BiometricDevice';
import * as repo from './biometric.repository';
import { CreateDeviceInput } from './biometric.validation';
import { Role, WRITE_ROLES } from '../../types/roles';

function canManageDevices(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}

export function listDevices(): Promise<IBiometricDevice[]> {
  return repo.findMany();
}

export async function addDevice(input: CreateDeviceInput, role: Role): Promise<IBiometricDevice> {
  if (!canManageDevices(role)) throw ApiError.forbidden('Only Administrator, Principal, or Teacher may add a device');
  return repo.create(input);
}

export async function syncDevice(id: string, role: Role): Promise<IBiometricDevice> {
  if (!canManageDevices(role)) throw ApiError.forbidden('Only Administrator, Principal, or Teacher may sync a device');
  const device = await repo.findById(id);
  if (!device) throw ApiError.notFound('Device not found');
  const updated = await repo.markSynced(id);
  if (!updated) throw ApiError.notFound('Device not found');
  return updated;
}
