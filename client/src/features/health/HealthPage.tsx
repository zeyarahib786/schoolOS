import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import { useAuthStore } from '../../lib/store/authStore';
import * as healthApi from './health.api';
import type { ClinicVisit } from './health.api';
import { RecordVisitModal } from './RecordVisitModal';

const outcomeTone: Record<ClinicVisit['outcome'], 'green' | 'amber' | 'red'> = {
  'Returned to class': 'green',
  'Sent home': 'amber',
  'Referred to hospital': 'red',
};

function studentLabel(student: ClinicVisit['student']): string {
  return typeof student === 'string' ? student : `${student.name} (${student.refId})`;
}

export function HealthPage(): JSX.Element {
  const [items, setItems] = useState<ClinicVisit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRecord,setShowRecord]=useState(false);
  const role = useAuthStore((s) => s.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await healthApi.listVisits(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load clinic visits - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const sentHomeCount = items.filter((v) => v.outcome === 'Sent home').length;
  const isTeacher = role === 'Teacher';
  const canRecord=role==='Administrator'||role==='Principal'||role==='Teacher';

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showRecord&&<RecordVisitModal onClose={()=>setShowRecord(false)} onCreated={()=>load(page)}/>}
      <div style={{ marginBottom: 18,display:'flex',justifyContent:'space-between',alignItems:'start' }}><div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Health & Clinic</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          {isTeacher
            ? 'You can record a visit; the full clinic log is visible to Administrator and Principal only.'
            : 'Clinic visit records.'}
        </p>
        </div>{canRecord&&<button onClick={()=>setShowRecord(true)} style={{background:'#0E7C39',color:'#fff',border:0,borderRadius:8,padding:'8px 12px'}}>Record visit</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Visits (this page)" value={total} accentColor="#0E7C39" />
        <Kpi label="Sent home" value={sentHomeCount} accentColor="#B45309" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<ClinicVisit>
          keyField={(v) => v._id}
          rows={items}
          emptyLabel={
            isTeacher
              ? 'No visits are visible here - the full clinic log is restricted to Administrator and Principal.'
              : 'No clinic visits found.'
          }
          columns={[
            { header: 'Student', render: (v) => studentLabel(v.student) },
            { header: 'Reason', render: (v) => v.reason },
            { header: 'Outcome', render: (v) => <Chip label={v.outcome} tone={outcomeTone[v.outcome]} /> },
            { header: 'Date', render: (v) => new Date(v.createdAt).toLocaleDateString() },
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
