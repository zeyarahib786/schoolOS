import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import * as behaviourApi from './behaviour.api';
import type { BehaviourIncident } from './behaviour.api';
import { RecordIncidentModal } from './RecordIncidentModal';
import { useAuthStore } from '../../lib/store/authStore';

const severityTone: Record<BehaviourIncident['severity'], 'blue' | 'amber' | 'red'> = {
  Minor: 'blue',
  Moderate: 'amber',
  Serious: 'red',
};

function studentLabel(student: BehaviourIncident['student']): string {
  return typeof student === 'string' ? student : `${student.name} (${student.refId})`;
}

export function BehaviourPage(): JSX.Element {
  const [items, setItems] = useState<BehaviourIncident[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRecord,setShowRecord]=useState(false);
  const role=useAuthStore((state)=>state.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await behaviourApi.listIncidents(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load behaviour records - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const seriousCount = items.filter((i) => i.severity === 'Serious').length;
  const canRecord=role==='Administrator'||role==='Principal'||role==='Teacher';

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showRecord&&<RecordIncidentModal onClose={()=>setShowRecord(false)} onCreated={()=>load(page)}/>}
      <div style={{ marginBottom: 18,display:'flex',justifyContent:'space-between',alignItems:'start' }}><div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Behaviour</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>Incident records - a Parent sees only their own child's.</p>
        </div>{canRecord&&<button onClick={()=>setShowRecord(true)} style={{background:'#0E7C39',color:'#fff',border:0,borderRadius:8,padding:'8px 12px'}}>Record incident</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Incidents (this page)" value={total} accentColor="#0E7C39" />
        <Kpi label="Serious" value={seriousCount} accentColor="#B42318" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<BehaviourIncident>
          keyField={(i) => i._id}
          rows={items}
          emptyLabel="No behaviour records found."
          columns={[
            { header: 'Student', render: (i) => studentLabel(i.student) },
            { header: 'Category', render: (i) => i.category },
            { header: 'Severity', render: (i) => <Chip label={i.severity} tone={severityTone[i.severity]} /> },
            { header: 'Date', render: (i) => new Date(i.createdAt).toLocaleDateString() },
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
