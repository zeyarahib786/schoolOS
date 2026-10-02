import { ApiError } from '../../utils/ApiError';
import * as repo from './reports.repository';
import { Role } from '../../types/roles';

/** Management-only READ: the same Administrator/Principal subset Leave uses for its write side,
 * applied here to reading for the first time - a school-wide dashboard aggregating fees and
 * staffing is leadership material, not something every Teacher (let alone Parent) should see. */
const REPORT_ROLES: Role[] = ['Administrator', 'Principal'];

export function overview(role: Role) {
  if (!REPORT_ROLES.includes(role)) throw ApiError.forbidden('Only Administrator or Principal may view school reports');
  return repo.overview();
}
