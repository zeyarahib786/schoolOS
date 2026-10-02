import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import { useAuthStore } from '../../lib/store/authStore';
import * as attendanceApi from './attendance.api';
import type { AttendanceRecord } from './attendance.api';
import { MarkAttendanceModal } from './MarkAttendanceModal';

const statusTone: Record<AttendanceRecord['status'], 'green' | 'amber' | 'red' | 'blue'> = {
  Present: 'green',
  Late: 'amber',
  Absent: 'red',
  Excused: 'blue',
};

function studentLabel(student: AttendanceRecord['student']): string {
  return typeof student === 'string' ? student : `${student.name} (${student.refId})`;
}

export function AttendancePage(): JSX.Element {
  const [items, setItems] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const role = useAuthStore((s) => s.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await attendanceApi.listAttendance(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load attendance - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const presentCount = items.filter((a) => a.status === 'Present').length;
  const absentCount = items.filter((a) => a.status === 'Absent').length;
  const lateCount = items.filter((a) => a.status === 'Late').length;

  const isParentOrStudent = role === 'Parent' || role === 'Student';
  const canMark = role === 'Administrator' || role === 'Principal' || role === 'Teacher';

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showMarkModal && <MarkAttendanceModal onClose={() => setShowMarkModal(false)} onMarked={() => load(page)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Attendance</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          {isParentOrStudent ? "Your child's attendance record." : 'Attendance records across all sessions.'}
        </p>
        </div>
        {canMark && <button onClick={() => setShowMarkModal(true)} style={{ padding: '8px 12px', borderRadius: 8, border: 0, background: '#0E7C39', color: '#fff', whiteSpace: 'nowrap' }}>Mark attendance</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Present (this page)" value={presentCount} accentColor="#0E7C39" />
        <Kpi label="Absent" value={absentCount} accentColor="#B42318" />
        <Kpi label="Late" value={lateCount} accentColor="#B45309" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<AttendanceRecord>
          keyField={(a) => a._id}
          rows={items}
          emptyLabel={
            isParentOrStudent ? 'No attendance records linked to your account yet.' : 'No attendance records found.'
          }
          columns={[
            { header: 'Student', render: (a) => studentLabel(a.student) },
            { header: 'Date', render: (a) => new Date(a.date).toLocaleDateString() },
            { header: 'Session', render: (a) => a.session },
            { header: 'Status', render: (a) => <Chip label={a.status} tone={statusTone[a.status]} /> },
          ]}
        />
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 14,
          fontSize: 12.5,
          color: '#64748B',
        }}
      >
        <span>
          Page {page} of {Math.max(totalPages, 1)} · {total} total
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: '#fff',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: '#fff',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
