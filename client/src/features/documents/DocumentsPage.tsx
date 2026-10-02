import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import * as documentsApi from './documents.api';
import type { SchoolDocument } from './documents.api';
import { PublishDocumentModal } from './PublishDocumentModal';
import { canWrite, useAuthStore } from '../../lib/store/authStore';

const categoryTone: Record<SchoolDocument['category'], 'green' | 'blue' | 'amber' | 'gray'> = {
  Policy: 'green',
  Form: 'blue',
  Circular: 'amber',
  Guideline: 'gray',
};

export function DocumentsPage(): JSX.Element {
  const [items, setItems] = useState<SchoolDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const role = useAuthStore((state) => state.user?.role);

  const load = useCallback(async (p: number, history: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const result = await documentsApi.listDocuments(p, history);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load documents - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, includeHistory);
  }, [page, includeHistory, load]);

  const categoriesShown = new Set(items.map((d) => d.category)).size;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showPublish && <PublishDocumentModal onClose={() => setShowPublish(false)} onSaved={() => load(page, includeHistory)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Documents</h1><p style={{ fontSize: 12.5, color: '#64748B' }}>Policies, forms, and circulars - always showing the current version of each document.</p></div>
        {canWrite(role) && <button onClick={() => setShowPublish(true)} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap' }}>Publish record</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label={includeHistory ? 'All versions' : 'Current documents'} value={total} accentColor="#0E7C39" />
        <Kpi label="Categories on this page" value={categoriesShown} accentColor="#2563EB" />
      </div>

      <label style={{ display: 'block', marginBottom: 14, fontSize: 12.5 }}><input type="checkbox" checked={includeHistory} onChange={(event) => { setPage(1); setIncludeHistory(event.target.checked); }} /> Show superseded versions</label>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<SchoolDocument>
          keyField={(d) => d._id}
          rows={items}
          emptyLabel="No documents published yet."
          columns={[
            { header: 'Code', render: (d) => d.code },
            { header: 'Title', render: (d) => d.title },
            { header: 'Category', render: (d) => <Chip label={d.category} tone={categoryTone[d.category]} /> },
            { header: 'Version', render: (d) => `v${d.version}`, align: 'right' },
            ...(includeHistory ? [{ header: 'State', render: (d: SchoolDocument) => <Chip label={d.isCurrent ? 'Current' : 'Superseded'} tone={d.isCurrent ? 'green' : 'gray'} /> }] : []),
            {
              header: 'Summary',
              render: (d) => (d.description.length > 60 ? `${d.description.slice(0, 60)}…` : d.description),
            },
            {
              header: 'File',
              render: (d) => d.fileId
                ? <button onClick={() => void documentsApi.downloadDocument(d).catch(() => setError('PDF download failed - please try again'))}>Download PDF</button>
                : 'Paper / metadata only',
            },
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
