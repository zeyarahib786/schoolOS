import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { DataTable } from '../../components/ui/DataTable';
import { useAuthStore } from '../../lib/store/authStore';
import * as reportsApi from './reports.api';
import type { ReportsOverview, StatusCount } from './reports.api';

export function ReportsPage(): JSX.Element {
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const role = useAuthStore((s) => s.user?.role);
  const isManagement = role === 'Administrator' || role === 'Principal';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await reportsApi.getOverview());
    } catch {
      setError('Could not load reports - Administrator or Principal access is required');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isManagement) load();
    else setLoading(false);
  }, [load, isManagement]);

  if (!isManagement) {
    return (
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Reports</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          School-wide reports are leadership material and aren't visible to your role.
        </p>
      </div>
    );
  }

  const activeStudents = data?.students.byStatus.find((s) => s._id === 'Active')?.count ?? 0;
  const totalStaff = data?.staff.byType.reduce((sum, t) => sum + t.count, 0) ?? 0;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Reports</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          A school-wide overview, computed live across students, staff, fees, and helpdesk.
        </p>
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
              <Kpi label="Active students" value={activeStudents} accentColor="#0E7C39" />
              <Kpi label="Staff" value={totalStaff} accentColor="#2563EB" />
              <Kpi
                label="Avg GPA (active)"
                value={data.students.averages ? data.students.averages.avgGpa.toFixed(2) : '—'}
                accentColor="#B45309"
              />
              <Kpi
                label="Avg attendance %"
                value={data.students.averages ? data.students.averages.avgAttendancePct.toFixed(1) : '—'}
                accentColor="#7C3AED"
              />
            </div>

            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Fees by status</h2>
            <DataTable<ReportsOverview['fees']['byStatus'][number]>
              keyField={(f) => f._id}
              rows={data.fees.byStatus}
              emptyLabel="No invoices yet."
              columns={[
                { header: 'Status', render: (f) => f._id },
                { header: 'Invoices', render: (f) => String(f.count), align: 'right' },
                { header: 'Total amount', render: (f) => f.totalAmount.toLocaleString(), align: 'right' },
              ]}
            />

            <h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 8px' }}>Helpdesk by status</h2>
            <DataTable<StatusCount>
              keyField={(t) => t._id}
              rows={data.helpdesk.byStatus}
              emptyLabel="No tickets yet."
              columns={[
                { header: 'Status', render: (t) => t._id },
                { header: 'Tickets', render: (t) => String(t.count), align: 'right' },
              ]}
            />
          </>
        )
      )}
    </div>
  );
}
