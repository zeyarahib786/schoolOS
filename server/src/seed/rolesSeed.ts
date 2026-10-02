import { logger } from '../utils/logger';
import { ensureSystemRoles } from '../modules/roles/roles.repository';

export async function seedAccessRoles(): Promise<void> {
  await ensureSystemRoles();
  logger.info('Seeded Roles & Access: 6 system roles and 11 governed modules');
}
