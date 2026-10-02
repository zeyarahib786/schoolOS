import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import * as hostelApi from './hostel.api';
import type { HostelRoom } from './hostel.api';
import { HostelActionModal } from './HostelActionModal';
import { canWrite, useAuthStore } from '../../lib/store/authStore';

export function HostelPage(): JSX.Element {
  const [items, setItems] = useState<HostelRoom[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: 'room' | 'allocate'; room?: HostelRoom } | null>(null);
  const role = useAuthStore((state) => state.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await hostelApi.listRooms(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load hostel rooms - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const fullRooms = items.filter((r) => r.occupants.length >= r.capacity).length;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {modal && <HostelActionModal mode={modal.mode} room={modal.room} onClose={() => setModal(null)} onSaved={() => load(page)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Hostel</h1><p style={{ fontSize: 12.5, color: '#64748B' }}>Room occupancy - allocation is capacity-guarded, same as Transport seats.</p></div>
        {canWrite(role) && <button onClick={() => setModal({ mode: 'room' })} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap' }}>Add room</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Rooms (this page)" value={total} accentColor="#0E7C39" />
        <Kpi label="Full" value={fullRooms} accentColor="#B45309" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<HostelRoom>
          keyField={(r) => r._id}
          rows={items}
          emptyLabel="No rooms found."
          columns={[
            { header: 'Room', render: (r) => `${r.block}-${r.roomNumber}` },
            { header: 'Occupancy', render: (r) => `${r.occupants.length} / ${r.capacity}`, align: 'right' },
            {
              header: 'Status',
              render: (r) => (
                <Chip
                  label={r.occupants.length >= r.capacity ? 'Full' : 'Available'}
                  tone={r.occupants.length >= r.capacity ? 'red' : 'green'}
                />
              ),
            },
            ...(canWrite(role) ? [{ header: 'Actions', render: (r: HostelRoom) => <button disabled={r.occupants.length >= r.capacity} onClick={() => setModal({ mode: 'allocate', room: r })}>{r.occupants.length >= r.capacity ? 'Room full' : 'Allocate student'}</button> }] : []),
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
