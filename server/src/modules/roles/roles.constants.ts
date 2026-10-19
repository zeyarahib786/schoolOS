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
  'Enrolment CRM',
  'Staff & HR',
  'Parents',
  'Classes & Sections',
  'Timetable',
  'Curriculum',
  'Learning (LMS)',
  'Behaviour',
  'Health & Clinic',
  'Cafeteria',
  'Expenses',
  'Library',
  'Transport',
  'Hostel',
  'Inventory',
  'Biometric Registry',
  'Visitor Management',
  'Facilities & Bookings',
  'Events Calendar',
  'Surveys & Feedback',
  'Certificates',
  'Documents',
  'ID Cards',
  'Alumni',
  'Helpdesk',
  'Roles & Access',
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
    description: 'Finance operations',
    permissions: permissions('Fees & Finance', 'Payroll'),
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

// Additional released workspaces retain role-specific action checks in their APIs.
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Enrolment CRM'] = ['Administrator', 'Principal'].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Staff & HR'] = ['Administrator', 'Principal', 'Teacher', 'Accountant'].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Parents'] = ['Administrator', 'Principal', 'Parent'].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Classes & Sections'] = ['Administrator', 'Principal', 'Teacher'].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Timetable'] = ['Administrator', 'Principal', 'Teacher', 'Accountant', 'Parent', 'Student'].includes(
    role.name,
  );
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Curriculum'] = ['Administrator', 'Principal', 'Teacher'].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Learning (LMS)'] = ['Administrator', 'Principal', 'Teacher', 'Parent', 'Student'].includes(
    role.name,
  );
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Behaviour'] = ['Administrator', 'Principal', 'Teacher', 'Parent', 'Student'].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Health & Clinic'] = ['Administrator', 'Principal', 'Teacher', 'Parent', 'Student'].includes(
    role.name,
  );
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Cafeteria'] = ['Administrator', 'Principal', 'Accountant', 'Parent', 'Student'].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Expenses'] = ['Administrator', 'Principal', 'Teacher', 'Accountant'].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Library'] = ['Administrator', 'Principal', 'Teacher', 'Parent', 'Student'].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Transport'] = ['Administrator', 'Principal', 'Teacher', 'Parent', 'Student'].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Hostel'] = ['Administrator', 'Principal', 'Teacher', 'Parent', 'Student'].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Inventory'] = ['Administrator', 'Principal', 'Teacher', 'Accountant'].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Biometric Registry'] = ['Administrator', 'Principal', 'Teacher'].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Visitor Management'] = ['Administrator', 'Principal', 'Teacher'].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Facilities & Bookings'] = ['Administrator', 'Principal', 'Teacher', 'Accountant'].includes(
    role.name,
  );
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Events Calendar'] = [
    'Administrator',
    'Principal',
    'Teacher',
    'Accountant',
    'Parent',
    'Student',
  ].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Surveys & Feedback'] = [
    'Administrator',
    'Principal',
    'Teacher',
    'Accountant',
    'Parent',
    'Student',
  ].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Certificates'] = ['Administrator', 'Principal', 'Teacher', 'Parent', 'Student'].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Documents'] = ['Administrator', 'Principal', 'Teacher', 'Accountant', 'Parent', 'Student'].includes(
    role.name,
  );
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['ID Cards'] = ['Administrator', 'Principal', 'Teacher', 'Accountant', 'Parent', 'Student'].includes(
    role.name,
  );
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Alumni'] = ['Administrator', 'Principal', 'Teacher', 'Parent', 'Student'].includes(role.name);
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Helpdesk'] = ['Administrator', 'Principal', 'Teacher', 'Accountant', 'Parent', 'Student'].includes(
    role.name,
  );
});
DEFAULT_ACCESS_ROLES.forEach((role) => {
  role.permissions['Roles & Access'] = ['Administrator'].includes(role.name);
});

export function roleKey(name: string): string {
  return name.trim().toLocaleLowerCase('en-US').replace(/\s+/g, '-');
}
