import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import { useAuthStore } from '../../lib/store/authStore';
import * as staffApi from './staff.api';
import type { StaffMember } from './staff.api';
import { CreateStaffModal } from './CreateStaffModal';
import { EditStaffModal } from './EditStaffModal';

const statusTone: Record<StaffMember['status'], 'green' | 'amber' | 'red' | 'gray'> = {
  Active: 'green',
  Onboarding: 'amber',
  'On Leave': 'amber',
  Inactive: 'red',
};

export function StaffPage(): JSX.Element {
  const [items, setItems] = useState<StaffMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const role = useAuthStore((s) => s.user?.role);

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await staffApi.listStaff(p, q);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      // A Teacher role legitimately sees an empty, ownership-scoped list rather than an error -
      // this only surfaces for a genuine network/auth failure, matching StudentsPage's pattern.
      setError('Could not load staff - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, search);
  }, [page, search, load]);

  const activeCount = items.filter((s) => s.status === 'Active').length;
  const onLeaveCount = items.filter((s) => s.status === 'On Leave').length;
  const canManage = role === 'Administrator' || role === 'Principal';

  async function setStatus(member: StaffMember, status: 'Active' | 'Inactive') {
    setUpdatingId(member._id);
    setError(null);
    try { await staffApi.updateStaff(member._id, { status }); await load(page, search); }
    catch { setError('Could not update staff status. Refresh and try again.'); }
    finally { setUpdatingId(null); }
  }

  async function remove(member: StaffMember) {
    if (!window.confirm(`Permanently delete ${member.name}'s staff record? This cannot be undone.`)) return;
    setUpdatingId(member._id); setError(null);
    try { await staffApi.deleteStaff(member._id); await load(page, search); }
    catch { setError('Could not delete staff record. Please check your permission and try again.'); }
    finally { setUpdatingId(null); }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showCreateModal && <CreateStaffModal onClose={() => setShowCreateModal(false)} onCreated={() => load(page, search)} />}
      {editing && <EditStaffModal member={editing} onClose={() => setEditing(null)} onSaved={() => load(page, search)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Staff & HR</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          {role === 'Teacher' || role === 'Student' || role === 'Parent'
            ? 'Your own linked staff record, if any.'
            : 'Full staff directory - teaching and non-teaching.'}
        </p>
        </div>
        {canManage && <button onClick={() => setShowCreateModal(true)} style={{ padding: '8px 12px', borderRadius: 8, border: 0, background: '#0E7C39', color: '#fff', whiteSpace: 'nowrap' }}>Add staff</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Total staff (this page)" value={total} accentColor="#0E7C39" />
        <Kpi label="Active" value={activeCount} accentColor="#2563EB" />
        <Kpi label="On leave" value={onLeaveCount} accentColor="#B45309" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <input
          aria-label="Search staff"
          placeholder="Search by name or reference"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 12px' }}
        />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<StaffMember>
          keyField={(s) => s._id}
          rows={items}
          emptyLabel={
            role === 'Teacher' || role === 'Student' || role === 'Parent'
              ? 'No staff record is linked to your account yet.'
              : 'No staff match your search'
          }
          columns={[
            { header: 'Name', render: (s) => s.name },
            { header: 'Reference', render: (s) => s.refId },
            { header: 'Designation', render: (s) => s.designation },
            { header: 'Department', render: (s) => s.department },
            { header: 'Status', render: (s) => <Chip label={s.status} tone={statusTone[s.status]} /> },
            ...(canManage ? [{
              header: 'Actions',
              render: (s: StaffMember) => <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}><button onClick={() => setEditing(s)}>Edit</button>{s.status === 'On Leave' ? <span style={{ color: '#64748B', fontSize: 12 }}>Managed through Leave</span> : <button disabled={updatingId === s._id} onClick={() => setStatus(s, s.status === 'Active' ? 'Inactive' : 'Active')}>{updatingId === s._id ? 'Saving…' : s.status === 'Active' ? 'Deactivate' : 'Activate'}</button>}{role === 'Administrator' && <button disabled={updatingId === s._id} onClick={() => remove(s)}>Delete</button>}</div>,
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
