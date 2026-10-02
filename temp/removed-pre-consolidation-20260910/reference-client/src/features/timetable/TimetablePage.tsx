import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { DataTable } from '../../components/ui/DataTable';
import * as timetableApi from './timetable.api';
import type { TimetableSlot } from './timetable.api';
import { CreateTimetableSlotModal } from './CreateTimetableSlotModal';
import { canWrite, useAuthStore } from '../../lib/store/authStore';

export function TimetablePage(): JSX.Element {
  const [items, setItems] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const role = useAuthStore((state) => state.user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await timetableApi.listSlots();
      setItems(result);
    } catch {
      setError('Could not load the timetable - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const gradesCovered = new Set(items.map((s) => s.grade)).size;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showCreate && <CreateTimetableSlotModal onClose={() => setShowCreate(false)} onSaved={load} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Timetable</h1><p style={{ fontSize: 12.5, color: '#64748B' }}>Class schedules - one subject per grade per period, enforced.</p></div>
        {canWrite(role) && <button onClick={() => setShowCreate(true)} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap' }}>Schedule period</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Scheduled periods" value={items.length} accentColor="#0E7C39" />
        <Kpi label="Grades covered" value={gradesCovered} accentColor="#2563EB" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<TimetableSlot>
          keyField={(s) => s._id}
          rows={items}
          emptyLabel="No periods scheduled yet."
          columns={[
            { header: 'Grade', render: (s) => s.grade },
            { header: 'Day', render: (s) => s.dayOfWeek },
            { header: 'Period', render: (s) => String(s.periodNumber), align: 'right' },
            { header: 'Subject', render: (s) => s.subject },
            { header: 'Teacher', render: (s) => s.teacherName },
          ]}
        />
      )}
    </div>
  );
}
