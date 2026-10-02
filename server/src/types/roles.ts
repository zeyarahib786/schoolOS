/** Shared application roles. Administrator, Principal, and Teacher have general write access;
 * resource-specific permissions are enforced by the corresponding modules. */
export const ROLES = ['Administrator', 'Principal', 'Teacher', 'Accountant', 'Parent', 'Student'] as const;
export type Role = (typeof ROLES)[number];

export const WRITE_ROLES: Role[] = ['Administrator', 'Principal', 'Teacher'];
