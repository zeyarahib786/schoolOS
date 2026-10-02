import { apiClient } from '../../lib/api/client';

export const ACCESS_MODULES = ['Students', 'Admissions', 'Attendance', 'Exams & Gradebook', 'Fees & Finance', 'Payroll', 'Communication', 'AI Insights', 'Reports', 'Audit Log', 'Settings'] as const;
export type AccessModule = (typeof ACCESS_MODULES)[number];

export interface AccessRole {
  _id: string;
  name: string;
  description: string;
  basedOn?: string | null;
  isSystem: boolean;
  permissions: Record<AccessModule, boolean>;
}

interface RolesResponse {
  roles: AccessRole[];
  modules: readonly AccessModule[];
  usersByRole: Record<string, number>;
  totalUsers: number;
}

export const rolesApi = {
  list: () => apiClient.get<{ success: true; data: RolesResponse }>('/roles'),
  create: (input: { name: string; basedOn: string; description?: string }) =>
    apiClient.post<{ success: true; data: AccessRole }>('/roles', input),
  setPermission: (roleId: string, moduleName: AccessModule, enabled: boolean) =>
    apiClient.patch<{ success: true; data: AccessRole }>(`/roles/${roleId}/permissions/${encodeURIComponent(moduleName)}`, { enabled }),
};
