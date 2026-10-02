import { Role } from '../../types/roles';

export const ACCESS_MODULES = [
  'Students',
  'Admissions',
  'Attendance',
  'Exams & Gradebook',
  'Fees & Finance',
  'Payroll',
  'Communication',
  'AI Insights',
  'Reports',
  'Audit Log',
  'Settings',
] as const;

export type AccessModule = (typeof ACCESS_MODULES)[number];
export type PermissionMap = Record<AccessModule, boolean>;

const permissions = (...enabled: AccessModule[]): PermissionMap =>
  Object.fromEntries(ACCESS_MODULES.map((moduleName) => [moduleName, enabled.includes(moduleName)])) as PermissionMap;

export interface DefaultAccessRole {
  name: Role;
  description: string;
  permissions: PermissionMap;
}

/** Mirrors the established Roles & Access screen exactly. These are module-visibility grants;
 * every API action continues to apply its more specific server-side authorization rules. */
export const DEFAULT_ACCESS_ROLES: readonly DefaultAccessRole[] = [
  {
    name: 'Administrator',
    description: 'Full platform administration',
    permissions: permissions(...ACCESS_MODULES),
  },
  {
    name: 'Principal',
    description: 'School leadership and academic oversight',
    permissions: permissions(
      'Students',
      'Admissions',
      'Attendance',
      'Exams & Gradebook',
      'Fees & Finance',
      'Communication',
      'AI Insights',
      'Reports',
      'Settings',
    ),
  },
  {
    name: 'Teacher',
    description: 'Teaching and classroom operations',
    permissions: permissions('Students', 'Attendance', 'Exams & Gradebook', 'Communication'),
  },
  {
    name: 'Accountant',
    description: 'Finance and reporting operations',
    permissions: permissions('Fees & Finance', 'Payroll', 'Reports'),
  },
  {
    name: 'Parent',
    description: 'Guardian self-service access',
    permissions: permissions('Attendance', 'Exams & Gradebook', 'Fees & Finance', 'Communication'),
  },
  {
    name: 'Student',
    description: 'Student self-service access',
    permissions: permissions('Attendance', 'Exams & Gradebook', 'Communication'),
  },
] as const;

export function roleKey(name: string): string {
  return name.trim().toLocaleLowerCase('en-US').replace(/\s+/g, '-');
}
