import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import * as certificatesApi from './certificates.api';
import type { Certificate } from './certificates.api';
import { IssueCertificateModal } from './IssueCertificateModal';
import { canWrite, useAuthStore } from '../../lib/store/authStore';

const typeTone: Record<Certificate['type'], 'green' | 'blue' | 'amber' | 'gray'> = {
  Bonafide: 'green',
  Transfer: 'blue',
  Character: 'amber',
  Study: 'gray',
};

function studentLabel(student: Certificate['student']): string {
  return typeof student === 'string' ? student : `${student.name} (${student.refId})`;
}

export function CertificatesPage(): JSX.Element {
  const [items, setItems] = useState<Certificate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIssue, setShowIssue] = useState(false);
  const role = useAuthStore((state) => state.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await certificatesApi.listCertificates(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load certificates - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const thisMonthCount = items.filter((c) => new Date(c.issuedDate).getMonth() === new Date().getMonth()).length;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showIssue && <IssueCertificateModal onClose={() => setShowIssue(false)} onSaved={() => load(page)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Certificates</h1><p style={{ fontSize: 12.5, color: '#64748B' }}>Issued certificates with sequential, verifiable reference numbers.</p></div>
        {canWrite(role) && <button onClick={() => setShowIssue(true)} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap' }}>Issue certificate</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Issued (this page)" value={total} accentColor="#0E7C39" />
        <Kpi label="Issued this month" value={thisMonthCount} accentColor="#2563EB" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<Certificate>
          keyField={(c) => c._id}
          rows={items}
          emptyLabel="No certificates found."
          columns={[
            { header: 'Reference', render: (c) => c.certNumber },
            { header: 'Student', render: (c) => studentLabel(c.student) },
            { header: 'Type', render: (c) => <Chip label={c.type} tone={typeTone[c.type]} /> },
            { header: 'Issued', render: (c) => new Date(c.issuedDate).toLocaleDateString() },
            { header: 'Purpose', render: (c) => c.purpose ?? '—' },
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
