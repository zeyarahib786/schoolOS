import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import * as leaveApi from './leave.api';
import type { LeaveRequest } from './leave.api';
import { RequestLeaveModal } from './RequestLeaveModal';
import { useAuthStore } from '../../lib/store/authStore';

const statusTone: Record<LeaveRequest['status'], 'amber' | 'green' | 'red'> = {
  Pending: 'amber',
  Approved: 'green',
  Denied: 'red',
};

function staffLabel(staff: LeaveRequest['staff']): string {
  return typeof staff === 'string' ? staff : `${staff.name} (${staff.refId})`;
}

export function LeavePage(): JSX.Element {
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const role = useAuthStore((state) => state.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await leaveApi.listLeave(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load leave requests - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const pendingCount = items.filter((l) => l.status === 'Pending').length;
  const canDecide = role === 'Administrator' || role === 'Principal';

  async function decide(request: LeaveRequest, decision: leaveApi.LeaveDecision) {
    setDecidingId(request._id);
    setError(null);
    try { await leaveApi.decideLeave(request._id, decision); await load(page); }
    catch { setError('Could not decide this request. It may already be decided, be your own request, or exceed the leave balance.'); }
    finally { setDecidingId(null); }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showRequestModal && <RequestLeaveModal onClose={() => setShowRequestModal(false)} onCreated={() => load(page)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Leave</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          Staff leave requests - approval deducts from the annual balance; Administrator or Principal decide.
        </p>
        </div>
        <button onClick={() => setShowRequestModal(true)} style={{ padding: '8px 12px', borderRadius: 8, border: 0, background: '#0E7C39', color: '#fff', whiteSpace: 'nowrap' }}>Request leave</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Requests (visible to you)" value={total} accentColor="#0E7C39" />
        <Kpi label="Pending" value={pendingCount} accentColor="#B45309" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<LeaveRequest>
          keyField={(l) => l._id}
          rows={items}
          emptyLabel="No leave requests."
          columns={[
            { header: 'Staff', render: (l) => staffLabel(l.staff) },
            { header: 'From', render: (l) => new Date(l.fromDate).toLocaleDateString() },
            { header: 'To', render: (l) => new Date(l.toDate).toLocaleDateString() },
            { header: 'Days', render: (l) => String(l.days), align: 'right' },
            { header: 'Reason', render: (l) => (l.reason.length > 40 ? `${l.reason.slice(0, 40)}…` : l.reason) },
            { header: 'Status', render: (l) => <Chip label={l.status} tone={statusTone[l.status]} /> },
            ...(canDecide ? [{
              header: 'Actions',
              render: (l: LeaveRequest) => l.status !== 'Pending' ? <span style={{ color: '#64748B' }}>Decided</span> : (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button disabled={decidingId === l._id} onClick={() => decide(l, 'Approved')}>{decidingId === l._id ? 'Saving…' : 'Approve'}</button>
                  <button disabled={decidingId === l._id} onClick={() => decide(l, 'Denied')}>Deny</button>
                </div>
              ),
            }] : []),
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
