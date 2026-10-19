import { Guardian } from '../../models/Guardian';
import { ApiError } from '../../utils/ApiError';

/** Suspension blocks existing sessions as well as new logins; legacy accounts without
 * an explicitly linked Guardian remain supported by their existing Student links. */
export async function assertGuardianPortalAccess(id: string, role: string) {
  if (role === 'Parent' && (await Guardian.exists({ userId: id, portalStatus: 'Suspended' })))
    throw ApiError.forbidden('Your parent portal is suspended; contact school administration');
}
