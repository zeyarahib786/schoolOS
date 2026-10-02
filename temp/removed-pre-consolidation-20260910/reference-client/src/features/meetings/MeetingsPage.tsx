import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import * as meetingsApi from './meetings.api';
import type { MeetingSlot } from './meetings.api';
import { CreateMeetingSlotModal } from './CreateMeetingSlotModal';
import { useAuthStore } from '../../lib/store/authStore';
import { BookMeetingSlotModal } from './BookMeetingSlotModal';

function teacherLabel(teacher: MeetingSlot['teacher']): string {
  return typeof teacher === 'string' ? teacher : `${teacher.name} · ${teacher.department}`;
}

function studentLabel(student: MeetingSlot['bookedForStudent']): string {
  if (!student) return '—';
  return typeof student === 'string' ? student : `${student.name} (${student.refId})`;
}

export function MeetingsPage(): JSX.Element {
  const [items, setItems] = useState<MeetingSlot[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate,setShowCreate]=useState(false);const[bookingSlot,setBookingSlot]=useState<MeetingSlot|null>(null);const role=useAuthStore(s=>s.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await meetingsApi.listSlots(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load meeting slots - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const openCount = items.filter((s) => !s.bookedBy).length;
  const canCreate=role==='Administrator'||role==='Principal'||role==='Teacher';

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showCreate&&<CreateMeetingSlotModal onClose={()=>setShowCreate(false)} onCreated={()=>load(page)}/>}
      {bookingSlot&&<BookMeetingSlotModal slot={bookingSlot} onClose={()=>setBookingSlot(null)} onBooked={()=>load(page)}/>}
      <div style={{ marginBottom: 18,display:'flex',justifyContent:'space-between',alignItems:'start' }}><div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Parent-Teacher Meetings</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          Bookable meeting slots - first come, first served; a slot can only ever be booked once.
        </p>
        </div>{canCreate&&<button onClick={()=>setShowCreate(true)} style={{background:'#0E7C39',color:'#fff',border:0,borderRadius:8,padding:'8px 12px'}}>Publish slot</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Slots (this page)" value={total} accentColor="#0E7C39" />
        <Kpi label="Open on this page" value={openCount} accentColor="#2563EB" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<MeetingSlot>
          keyField={(s) => s._id}
          rows={items}
          emptyLabel="No meeting slots published yet."
          columns={[
            { header: 'Teacher', render: (s) => teacherLabel(s.teacher) },
            { header: 'Date', render: (s) => new Date(s.date).toLocaleDateString() },
            { header: 'Time', render: (s) => s.startTime },
            {
              header: 'Status',
              render: (s) => (s.bookedBy ? <Chip label="Booked" tone="gray" /> : <Chip label="Open" tone="green" />),
            },
            { header: 'For student', render: (s) => studentLabel(s.bookedForStudent) },
            ...(role==='Parent'?[{header:'Actions',render:(s:MeetingSlot)=>s.bookedBy?<span style={{color:'#64748B'}}>Unavailable</span>:<button onClick={()=>setBookingSlot(s)}>Book</button>}]:[]),
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
