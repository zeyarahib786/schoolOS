import { AccessRole, IAccessRole } from '../../models/AccessRole';
import { User } from '../../models/User';
import { DEFAULT_ACCESS_ROLES, AccessModule, PermissionMap, roleKey } from './roles.constants';

export async function ensureSystemRoles(): Promise<void> {
  await AccessRole.bulkWrite(
    DEFAULT_ACCESS_ROLES.map((role) => ({
      updateOne: {
        filter: { key: roleKey(role.name) },
        update: {
          $setOnInsert: {
            key: roleKey(role.name),
            name: role.name,
            description: role.description,
            isSystem: true,
            permissions: new Map(Object.entries(role.permissions)) as IAccessRole['permissions'],
          },
        },
        upsert: true,
      },
    })),
  );
}

export function listRoles(): Promise<IAccessRole[]> {
  return AccessRole.find().sort({ isSystem: -1, createdAt: 1, name: 1 });
}

export function findRoleByName(name: string): Promise<IAccessRole | null> {
  return AccessRole.findOne({ key: roleKey(name) });
}

export function createRole(input: {
  name: string;
  basedOn: string;
  description: string;
  permissions: PermissionMap;
}): Promise<IAccessRole> {
  return AccessRole.create({
    key: roleKey(input.name),
    name: input.name.trim(),
    basedOn: input.basedOn,
    description: input.description,
    isSystem: false,
    permissions: input.permissions,
  });
}

export function updatePermission(id: string, moduleName: AccessModule, enabled: boolean): Promise<IAccessRole | null> {
  return AccessRole.findByIdAndUpdate(
    id,
    { $set: { [`permissions.${moduleName}`]: enabled } },
    { new: true, runValidators: true },
  );
}

export async function countUsersByRole(): Promise<Record<string, number>> {
  const rows = await User.aggregate<{ _id: string; count: number }>([
    { $match: { isActive: true } },
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}
