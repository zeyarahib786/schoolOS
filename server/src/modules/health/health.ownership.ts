import { FilterQuery, Types } from 'mongoose';
import { IClinicVisit } from '../../models/ClinicVisit';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role } from '../../types/roles';

/** Deliberately narrower than Behaviour's read-access list - Administrator and Principal only,
 * NOT Teacher. Medical records are a more sensitive category than behaviour incidents; a teacher
 * has a real need to know about a classroom disruption, but not a blanket right to every
 * student's health history. Write access (recording a visit) is separately, and more broadly,
 * granted to Teacher too - a teacher who walks a student to the clinic needs to be ABLE to log
 * what happened, even though they can't browse the full history afterward. */
const UNRESTRICTED_READ_ROLES: Role[] = ['Administrator', 'Principal'];
const CAN_RECORD_ROLES: Role[] = ['Administrator', 'Principal', 'Teacher'];

export function scopeVisitFilter(
  base: FilterQuery<IClinicVisit>,
  requester: AuthenticatedUser,
  authorizedStudentIds: Types.ObjectId[],
): FilterQuery<IClinicVisit> {
  if (UNRESTRICTED_READ_ROLES.includes(requester.role)) {
    return base;
  }
  return { ...base, student: { $in: authorizedStudentIds } };
}

export function canRecordVisit(role: Role): boolean {
  return CAN_RECORD_ROLES.includes(role);
}
