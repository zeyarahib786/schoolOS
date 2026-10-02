import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { DataTable } from '../../components/ui/DataTable';
import * as transportApi from './transport.api';
import type { RouteItem } from './transport.api';
import { TransportActionModal } from './TransportActionModal';
import { canWrite, useAuthStore } from '../../lib/store/authStore';

function vehicleLabel(vehicle: RouteItem['vehicle']): string {
  return typeof vehicle === 'string' ? vehicle : `${vehicle.regNumber} (${vehicle.driverName})`;
}

function capacityLabel(route: RouteItem): string {
  const vehicleCapacity = typeof route.vehicle === 'string' ? '?' : route.vehicle.capacity;
  return `${route.assignedStudents.length} / ${vehicleCapacity}`;
}

export function TransportPage(): JSX.Element {
  const [items, setItems] = useState<RouteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: 'vehicle' | 'route' | 'assign'; route?: RouteItem } | null>(null);
  const role = useAuthStore((state) => state.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await transportApi.listRoutes(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load transport routes - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const totalStudents = items.reduce((s, r) => s + r.assignedStudents.length, 0);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {modal && <TransportActionModal mode={modal.mode} route={modal.route} onClose={() => setModal(null)} onSaved={() => load(page)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Transport</h1><p style={{ fontSize: 12.5, color: '#64748B' }}>Routes and vehicle capacity - seat assignment is capacity-guarded.</p></div>
        {canWrite(role) && <div style={{ display: 'flex', gap: 8 }}><button onClick={() => setModal({ mode: 'vehicle' })}>Add vehicle</button><button onClick={() => setModal({ mode: 'route' })} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px' }}>Create route</button></div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Routes (this page)" value={total} accentColor="#0E7C39" />
        <Kpi label="Students assigned" value={totalStudents} accentColor="#2563EB" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<RouteItem>
          keyField={(r) => r._id}
          rows={items}
          emptyLabel="No routes found."
          columns={[
            { header: 'Route', render: (r) => r.name },
            { header: 'Vehicle', render: (r) => vehicleLabel(r.vehicle) },
            { header: 'Stops', render: (r) => r.stops.join(', ') },
            { header: 'Seats', render: (r) => capacityLabel(r), align: 'right' },
            ...(canWrite(role) ? [{ header: 'Actions', render: (r: RouteItem) => <button onClick={() => setModal({ mode: 'assign', route: r })}>Assign student</button> }] : []),
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
