import { BiometricDevice, IBiometricDevice } from '../../models/BiometricDevice';
import { CreateDeviceInput } from './biometric.validation';

export function findMany(): Promise<IBiometricDevice[]> {
  return BiometricDevice.find().sort({ name: 1 });
}

export function findById(id: string): Promise<IBiometricDevice | null> {
  return BiometricDevice.findById(id);
}

export function create(input: CreateDeviceInput): Promise<IBiometricDevice> {
  return BiometricDevice.create(input);
}

export function markSynced(id: string): Promise<IBiometricDevice | null> {
  return BiometricDevice.findByIdAndUpdate(id, { status: 'Online', lastSyncAt: new Date() }, { new: true });
}
