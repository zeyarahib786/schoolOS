import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { DataTable } from '../../components/ui/DataTable';
import * as facilitiesApi from './facilities.api';
import type { Booking } from './facilities.api';
import { FacilityActionModal } from './FacilityActionModal';
import { useAuthStore } from '../../lib/store/authStore';

function facilityLabel(facility: Booking['facility']): string {
  return typeof facility === 'string' ? facility : facility.name;
}

export function FacilitiesPage(): JSX.Element {
  const [items, setItems] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action,setAction]=useState<'facility'|'booking'|null>(null);const role=useAuthStore(s=>s.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await facilitiesApi.listBookings(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load bookings - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const todayCount = items.filter((b) => new Date(b.date).toDateString() === new Date().toDateString()).length;
  const canManage=role==='Administrator'||role==='Principal'||role==='Teacher';

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {action&&<FacilityActionModal mode={action} onClose={()=>setAction(null)} onSaved={()=>load(page)}/>}
      <div style={{ marginBottom: 18,display:'flex',justifyContent:'space-between',alignItems:'start' }}><div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Facilities & Bookings</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          Room and facility reservations - double-booking is prevented at the database layer.
        </p>
        </div>{canManage&&<div style={{display:'flex',gap:8}}><button onClick={()=>setAction('facility')}>Add facility</button><button onClick={()=>setAction('booking')} style={{background:'#0E7C39',color:'#fff',border:0,borderRadius:8,padding:'8px 12px'}}>Book facility</button></div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Bookings (this page)" value={total} accentColor="#0E7C39" />
        <Kpi label="Today" value={todayCount} accentColor="#2563EB" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<Booking>
          keyField={(b) => b._id}
          rows={items}
          emptyLabel="No bookings found."
          columns={[
            { header: 'Facility', render: (b) => facilityLabel(b.facility) },
            { header: 'Date', render: (b) => new Date(b.date).toLocaleDateString() },
            { header: 'Time', render: (b) => `${b.startTime} - ${b.endTime}` },
            { header: 'Purpose', render: (b) => b.purpose },
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
