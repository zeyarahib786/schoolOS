import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import { useAuthStore } from '../../lib/store/authStore';
import * as visitorsApi from './visitors.api';
import type { VisitorLog } from './visitors.api';
import { CheckInVisitorModal } from './CheckInVisitorModal';

const statusTone: Record<VisitorLog['status'], 'green' | 'gray'> = {
  CheckedIn: 'green',
  CheckedOut: 'gray',
};

export function VisitorsPage(): JSX.Element {
  const [items, setItems] = useState<VisitorLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  const role = useAuthStore((s) => s.user?.role);
  const isStaff = role === 'Administrator' || role === 'Principal' || role === 'Teacher';

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await visitorsApi.listVisitors(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load the visitor log - Administrator, Principal, or Teacher access is required');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStaff) load(page);
    else setLoading(false);
  }, [page, load, isStaff]);

  const checkedInCount = items.filter((v) => v.status === 'CheckedIn').length;

  async function checkOut(visitor: VisitorLog) {
    setCheckingOutId(visitor._id); setError(null);
    try { await visitorsApi.checkOutVisitor(visitor._id); await load(page); }
    catch { setError('Could not check out visitor. The visitor may already be checked out.'); }
    finally { setCheckingOutId(null); }
  }

  if (!isStaff) {
    return (
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Visitors</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          The visitor log is a staff-only security record and isn't visible to your role.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showCheckIn && <CheckInVisitorModal onClose={() => setShowCheckIn(false)} onSaved={() => load(page)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Visitors</h1><p style={{ fontSize: 12.5, color: '#64748B' }}>Front-desk check-in and check-out log.</p></div>
        <button onClick={() => setShowCheckIn(true)} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap' }}>Check in visitor</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="On site now" value={checkedInCount} accentColor="#0E7C39" />
        <Kpi label="Total (this page)" value={total} accentColor="#2563EB" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<VisitorLog>
          keyField={(v) => v._id}
          rows={items}
          emptyLabel="No visitors logged."
          columns={[
            { header: 'Visitor', render: (v) => v.visitorName },
            { header: 'Purpose', render: (v) => v.purpose },
            { header: 'Host', render: (v) => v.hostName },
            { header: 'Checked in', render: (v) => new Date(v.checkedInAt).toLocaleString() },
            { header: 'Status', render: (v) => <Chip label={v.status} tone={statusTone[v.status]} /> },
            { header: 'Actions', render: (v) => v.status === 'CheckedIn' ? <button disabled={checkingOutId === v._id} onClick={() => checkOut(v)}>{checkingOutId === v._id ? 'Checking out…' : 'Check out'}</button> : <span style={{ color: '#64748B', fontSize: 12 }}>{v.checkedOutAt ? new Date(v.checkedOutAt).toLocaleString() : '—'}</span> },
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
