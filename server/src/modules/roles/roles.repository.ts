import { AccessRole, IAccessRole } from '../../models/AccessRole';
import { User } from '../../models/User';
import { DEFAULT_ACCESS_ROLES, AccessModule, PermissionMap, roleKey } from './roles.constants';

export async function ensureSystemRoles(): Promise<void> {
  const createdAt = new Date();
  await AccessRole.bulkWrite(
    DEFAULT_ACCESS_ROLES.map((role) => ({
      updateOne: {
        filter: { key: roleKey(role.name) },
        update: {
          $setOnInsert: {
            createdAt,
            updatedAt: createdAt,
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
    { timestamps: false },
  );
  // Add only absent permission keys; preserve every existing administrator decision.
  const roles = await AccessRole.find();
  const operations = roles.flatMap((role) => {
    const defaults = DEFAULT_ACCESS_ROLES.find((r) => r.name === (role.isSystem ? role.name : role.basedOn));
    return (Object.keys(DEFAULT_ACCESS_ROLES[0].permissions) as AccessModule[])
      .filter((moduleName) => !role.permissions.has(moduleName))
      .map((moduleName) => ({
        updateOne: {
          filter: { _id: role._id, [`permissions.${moduleName}`]: { $exists: false } },
          update: { $set: { [`permissions.${moduleName}`]: defaults?.permissions[moduleName] === true } },
        },
      }));
  });
  if (operations.length) await AccessRole.bulkWrite(operations);
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

export function updatePermission(
  id: string,
  moduleName: AccessModule,
  enabled: boolean,
  actor: string,
  expectedUpdatedAt?: string,
  reason?: string,
): Promise<IAccessRole | null> {
  return AccessRole.findOneAndUpdate(
    { _id: id, ...(expectedUpdatedAt ? { updatedAt: new Date(expectedUpdatedAt) } : {}) },
    {
      $set: { [`permissions.${moduleName}`]: enabled },
      $push: {
        history: {
          at: new Date(),
          by: actor,
          module: moduleName,
          enabled,
          reason: reason || 'Reviewed module visibility',
        },
      },
    },
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
