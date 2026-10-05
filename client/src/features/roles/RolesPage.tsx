import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { DataTable } from '../../components/ui/DataTable';
import { rolesApi } from './roles.api';
import type { AccessRole, AccessModule } from './roles.api';

export function RolesPage(): JSX.Element {
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [modules, setModules] = useState<readonly AccessModule[]>([]);
  const [usersByRole, setUsersByRole] = useState<Record<string, number>>({});
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await rolesApi.list();
      setRoles(res.data.data.roles);
      setModules(res.data.data.modules);
      setUsersByRole(res.data.data.usersByRole);
      setTotalUsers(res.data.data.totalUsers);
    } catch {
      setError('Could not load roles & permissions - Administrator access required.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePermission(roleId: string, moduleName: AccessModule, currentVal: boolean) {
    try {
      await rolesApi.setPermission(roleId, moduleName, !currentVal);
      await load();
    } catch {
      setError('Could not update permission.');
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Roles & Access Control</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>RBAC permissions matrix and system roles.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Total system roles" value={roles.length} accentColor="#0E7C39" />
        <Kpi label="Total active users" value={totalUsers} accentColor="#2563EB" />
        <Kpi label="Configured modules" value={modules.length} accentColor="#0E7C39" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          <DataTable<AccessRole>
            keyField={(r) => r._id}
            rows={roles}
            emptyLabel="No roles found."
            columns={[
              { header: 'Role Name', render: (r) => r.name },
              { header: 'Description', render: (r) => r.description },
              { header: 'Assigned Users', render: (r) => String(usersByRole[r.name] ?? 0) },
              { header: 'Type', render: (r) => (r.isSystem ? 'System Role' : 'Custom Role') },
            ]}
          />

          <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #E2E8F0', overflowX: 'auto' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Permissions Matrix</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: 8 }}>Module</th>
                  {roles.map((r) => (
                    <th key={r._id} style={{ padding: 8, textAlign: 'center' }}>
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map((m) => (
                  <tr key={m} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{m}</td>
                    {roles.map((r) => {
                      const enabled = r.permissions && r.permissions[m];
                      return (
                        <td key={r._id} style={{ padding: 8, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!enabled}
                            disabled={r.isSystem && r.name === 'Administrator'}
                            onChange={() => togglePermission(r._id, m, !!enabled)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

