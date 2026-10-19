import { z } from 'zod';
import { ACCESS_MODULES } from './roles.constants';

const roleName = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} &/_-]*$/u, 'Role name contains unsupported characters');

export const createAccessRoleSchema = z.object({
  body: z.object({
    name: roleName,
    basedOn: roleName,
    description: z.string().trim().max(300).default(''),
  }),
});

export const updatePermissionSchema = z.object({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid role id'), module: z.enum(ACCESS_MODULES) }),
  body: z.object({
    enabled: z.boolean(),
    expectedUpdatedAt: z.string().datetime().optional(),
    reason: z.string().trim().min(3).max(500).optional(),
  }),
});

export type CreateAccessRoleInput = z.infer<typeof createAccessRoleSchema>['body'];
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>['body'];
