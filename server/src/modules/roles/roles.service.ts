import { Error as MongooseError } from 'mongoose';
import { AuthenticatedUser } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { logAudit } from '../audit/audit.service';
import { CreateAccessRoleInput, UpdatePermissionInput } from './roles.validation';
import { ACCESS_MODULES, DEFAULT_ACCESS_ROLES, AccessModule, PermissionMap } from './roles.constants';
import * as repo from './roles.repository';

function permissionObject(value: Map<AccessModule, boolean>): PermissionMap {
  return Object.fromEntries(
    ACCESS_MODULES.map((moduleName) => [moduleName, value.get(moduleName) === true]),
  ) as PermissionMap;
}

export async function listRoles() {
  await repo.ensureSystemRoles();
  const [roles, usersByRole] = await Promise.all([repo.listRoles(), repo.countUsersByRole()]);
  const order = new Map<string, number>(DEFAULT_ACCESS_ROLES.map((role, index) => [role.name, index]));
  roles.sort(
    (left, right) =>
      (order.get(left.name) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.name) ?? Number.MAX_SAFE_INTEGER) ||
      left.name.localeCompare(right.name),
  );
  return {
    roles,
    modules: ACCESS_MODULES,
    usersByRole,
    totalUsers: Object.values(usersByRole).reduce((sum, count) => sum + count, 0),
  };
}

export async function myAccess(requester: AuthenticatedUser) {
  await repo.ensureSystemRoles();
  const role = await repo.findRoleByName(requester.role);
  if (!role) throw ApiError.notFound('Access role is not configured');
  return role;
}

export async function createRole(input: CreateAccessRoleInput, requester: AuthenticatedUser) {
  await repo.ensureSystemRoles();
  const base = await repo.findRoleByName(input.basedOn);
  if (!base) throw ApiError.notFound('Base role not found');
  if (await repo.findRoleByName(input.name)) throw ApiError.conflict('A role with this name already exists');
  try {
    const created = await repo.createRole({ ...input, permissions: permissionObject(base.permissions) });
    await logAudit(
      `Created access role ${created.name} based on ${base.name}`,
      'Roles & Access',
      requester.id,
      'Warning',
    );
    return created;
  } catch (error) {
    if (error instanceof MongooseError.ValidationError) throw ApiError.badRequest(error.message);
    if ((error as { code?: number }).code === 11000) throw ApiError.conflict('A role with this name already exists');
    throw error;
  }
}

export async function updatePermission(
  roleId: string,
  moduleName: AccessModule,
  input: UpdatePermissionInput,
  requester: AuthenticatedUser,
) {
  const role = await repo.updatePermission(roleId, moduleName, input.enabled);
  if (!role) throw ApiError.notFound('Role not found');
  await logAudit(
    `${input.enabled ? 'Granted' : 'Revoked'} ${moduleName} access - ${role.name}`,
    'Roles & Access',
    requester.id,
    /Payroll|Audit Log|Fees|Settings/.test(moduleName) ? 'Warning' : 'Info',
  );
  return role;
}
