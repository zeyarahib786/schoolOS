import { AuthenticatedUser } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { logAudit } from '../audit/audit.service';
import * as baseRepo from './meetings.repository';
import * as workflowRepo from './meetings.workflow.repository';
import { StaffBookSlotInput } from './meetings.validation';

export async function bookOnBehalf(slotId: string, input: StaffBookSlotInput, user: AuthenticatedUser) {
  const guardian = await workflowRepo.findGuardianWithStudent(input.guardianId, input.studentId);
  if (!guardian) throw ApiError.badRequest('The selected student is not linked to this guardian');
  const booked = await workflowRepo.bookOnBehalf(slotId, input.guardianId, input.studentId, input.note);
  if (!booked) {
    if (!(await baseRepo.findById(slotId))) throw ApiError.notFound('Meeting slot not found');
    throw ApiError.conflict('This slot is no longer available');
  }
  await logAudit(`Booked PTM slot for ${guardian.refId}`, 'Communication', user.id);
  return booked;
}

export async function confirm(slotId: string, user: AuthenticatedUser) {
  const confirmed = await workflowRepo.confirm(slotId);
  if (!confirmed) {
    const slot = await baseRepo.findById(slotId);
    if (!slot) throw ApiError.notFound('Meeting slot not found');
    throw ApiError.conflict(`Only a Pending meeting can be confirmed (currently ${slot.status})`);
  }
  await logAudit(`Confirmed PTM ${slotId}`, 'Communication', user.id);
  return confirmed;
}

export async function cancel(slotId: string, user: AuthenticatedUser) {
  const cancelled = await workflowRepo.cancel(slotId);
  if (!cancelled) {
    const slot = await baseRepo.findById(slotId);
    if (!slot) throw ApiError.notFound('Meeting slot not found');
    throw ApiError.conflict('Meeting slot is already available');
  }
  await logAudit(`Cancelled PTM ${slotId}`, 'Communication', user.id, 'Warning');
  return cancelled;
}

export async function reschedule(slotId: string, targetSlotId: string, user: AuthenticatedUser) {
  if (slotId === targetSlotId) throw ApiError.badRequest('Choose a different target slot');
  const moved = await workflowRepo.reschedule(slotId, targetSlotId);
  if (!moved) {
    if (!(await baseRepo.findById(slotId))) throw ApiError.notFound('Meeting slot not found');
    throw ApiError.conflict('Target slot is unavailable or belongs to a different teacher');
  }
  await logAudit(`Rescheduled PTM ${slotId} to ${targetSlotId}`, 'Communication', user.id);
  return moved;
}

export async function notify(slotId: string, _user: AuthenticatedUser) {
  const slot = await baseRepo.findById(slotId);
  if (!slot) throw ApiError.notFound('Meeting slot not found');
  if (slot.status === 'Available') throw ApiError.conflict('An available slot has no participants to notify');
  throw ApiError.badRequest(
    'Participant reminders are not configured; send an in-app message from Parents communication',
  );
}
