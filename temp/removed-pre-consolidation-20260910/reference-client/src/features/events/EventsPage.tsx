import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import * as eventsApi from './events.api';
import type { EventItem } from './events.api';
import { CreateEventModal } from './CreateEventModal';
import { canWrite, useAuthStore } from '../../lib/store/authStore';

const audienceTone: Record<EventItem['audience'], 'green' | 'blue' | 'amber' | 'gray'> = {
  All: 'green',
  Students: 'blue',
  Staff: 'amber',
  Parents: 'gray',
};

export function EventsPage(): JSX.Element {
  const [items, setItems] = useState<EventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const role = useAuthStore((state) => state.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await eventsApi.listEvents(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load events - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const withVenueCount = items.filter((e) => e.booking).length;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} onCreated={() => load(page)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Events Calendar</h1>
          <p style={{ fontSize: 12.5, color: '#64748B' }}>
            School events - venue-linked events share the same booking system as Facilities.
          </p>
        </div>
        {canWrite(role) && <button onClick={() => setShowCreate(true)} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap' }}>Create event</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Events (this page)" value={total} accentColor="#0E7C39" />
        <Kpi label="With a reserved venue" value={withVenueCount} accentColor="#2563EB" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<EventItem>
          keyField={(e) => e._id}
          rows={items}
          emptyLabel="No events found."
          columns={[
            { header: 'Event', render: (e) => e.title },
            { header: 'Date', render: (e) => new Date(e.date).toLocaleDateString() },
            { header: 'Audience', render: (e) => <Chip label={e.audience} tone={audienceTone[e.audience]} /> },
            { header: 'Venue', render: (e) => (e.booking ? 'Reserved' : '—') },
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
