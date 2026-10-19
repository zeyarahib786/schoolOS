import { BiometricDevice } from '../../models/BiometricDevice';
import { AuthenticatedUser } from '../../middleware/auth';
import { logAudit } from '../audit/audit.service';
import { z } from 'zod';
import { updateDeviceSchema } from './biometric.validation';
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
  try {
    return await repo.create(input);
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw ApiError.conflict('A device with this name is already registered');
    throw error;
  }
}

export async function syncDevice(id: string, role: Role): Promise<IBiometricDevice> {
  if (!canManageDevices(role)) throw ApiError.forbidden('Only Administrator, Principal, or Teacher may sync a device');
  const device = await repo.findById(id);
  if (!device) throw ApiError.notFound('Device not found');
  throw ApiError.conflict('Hardware connector is not configured; no sync or attendance import was performed');
}
export async function updateDevice(
  id: string,
  input: z.infer<typeof updateDeviceSchema>['body'],
  requester: AuthenticatedUser,
) {
  if (!canManageDevices(requester.role)) throw ApiError.forbidden('Teaching staff infrastructure role required');
  const current = await repo.findById(id);
  if (!current) throw ApiError.notFound('Device not found');
  if (input.status !== 'Unknown' && !input.observedAt)
    throw ApiError.badRequest('An observed device status requires the actual inspection time');
  if (input.observedAt && new Date(input.observedAt).getTime() > Date.now())
    throw ApiError.badRequest('Inspection time cannot be in the future');
  const { expectedUpdatedAt, reason, ...fields } = input;
  try {
    const saved = await BiometricDevice.findOneAndUpdate(
      { _id: id, updatedAt: new Date(expectedUpdatedAt) },
      {
        $set: { ...fields, observedAt: input.observedAt ? new Date(input.observedAt) : null },
        $push: {
          history: {
            at: new Date(),
            by: requester.id,
            reason,
            previous: {
              name: current.name,
              location: current.location,
              status: current.status,
              enabled: current.enabled,
            },
          },
        },
      },
      { new: true, runValidators: true },
    );
    if (!saved) throw ApiError.conflict('Device record changed; reload before reviewing');
    await logAudit('Reviewed biometric device ' + saved.name, 'Biometric', requester.id);
    return saved;
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw ApiError.conflict('A device with this name is already registered');
    throw error;
  }
}
