import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { DataTable } from '../../components/ui/DataTable';
import * as alumniApi from './alumni.api';
import type { AlumniProfile } from './alumni.api';
import { GraduateStudentModal } from './GraduateStudentModal';
import { canWrite, useAuthStore } from '../../lib/store/authStore';

function studentLabel(student: AlumniProfile['student']): string {
  return typeof student === 'string' ? student : `${student.name} (${student.refId})`;
}

export function AlumniPage(): JSX.Element {
  const [items, setItems] = useState<AlumniProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGraduate, setShowGraduate] = useState(false);
  const role = useAuthStore((state) => state.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await alumniApi.listAlumni(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load alumni - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const uniqueYears = new Set(items.map((a) => a.graduationYear)).size;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showGraduate && <GraduateStudentModal onClose={() => setShowGraduate(false)} onSaved={() => load(page)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Alumni</h1><p style={{ fontSize: 12.5, color: '#64748B' }}>Graduated students - a student's status changes to Alumni the moment they're added here.</p></div>
        {canWrite(role) && <button onClick={() => setShowGraduate(true)} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap' }}>Graduate student</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Alumni (this page)" value={total} accentColor="#0E7C39" />
        <Kpi label="Graduation years represented" value={uniqueYears} accentColor="#2563EB" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<AlumniProfile>
          keyField={(a) => a._id}
          rows={items}
          emptyLabel="No alumni records yet."
          columns={[
            { header: 'Name', render: (a) => studentLabel(a.student) },
            { header: 'Class of', render: (a) => String(a.graduationYear) },
            { header: 'Employer', render: (a) => a.currentEmployer ?? '—' },
            { header: 'Contact', render: (a) => a.contactEmail ?? '—' },
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
