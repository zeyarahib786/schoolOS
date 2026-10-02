import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { DataTable } from '../../components/ui/DataTable';
import * as curriculumApi from './curriculum.api';
import type { CurriculumUnit } from './curriculum.api';
import { CurriculumUnitModal } from './CurriculumUnitModal';
import { canWrite, useAuthStore } from '../../lib/store/authStore';

export function CurriculumPage(): JSX.Element {
  const [items, setItems] = useState<CurriculumUnit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CurriculumUnit | 'new' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const role = useAuthStore((state) => state.user?.role);

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await curriculumApi.listUnits(p, q);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load curriculum - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, search);
  }, [page, search, load]);

  const subjectCount = new Set(items.map((u) => u.subject)).size;
  const canManage = canWrite(role);

  async function remove(unit: CurriculumUnit) {
    if (!window.confirm(`Delete curriculum unit "${unit.title}"?`)) return;
    setDeletingId(unit._id); setError(null);
    try { await curriculumApi.deleteUnit(unit._id); await load(page, search); }
    catch { setError('Could not delete curriculum unit. Please check your permissions and try again.'); }
    finally { setDeletingId(null); }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {editing && <CurriculumUnitModal unit={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={() => load(page, search)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Curriculum</h1><p style={{ fontSize: 12.5, color: '#64748B' }}>Subjects, units, and learning outcomes - visible to every role.</p></div>
        {canManage && <button onClick={() => setEditing('new')} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap' }}>Add unit</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Units (this page)" value={total} accentColor="#0E7C39" />
        <Kpi label="Subjects (this page)" value={subjectCount} accentColor="#2563EB" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <input
          aria-label="Search curriculum units"
          placeholder="Search by title or outcomes"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 12px' }}
        />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<CurriculumUnit>
          keyField={(u) => u._id}
          rows={items}
          emptyLabel="No curriculum units found."
          columns={[
            { header: 'Subject', render: (u) => u.subject },
            { header: 'Term', render: (u) => u.term },
            { header: 'Unit', render: (u) => u.title },
            {
              header: 'Learning outcomes',
              render: (u) => (u.outcomes.length > 80 ? `${u.outcomes.slice(0, 80)}…` : u.outcomes),
            },
            ...(canManage ? [{ header: 'Actions', render: (u: CurriculumUnit) => <div style={{ display: 'flex', gap: 6 }}><button onClick={() => setEditing(u)}>Edit</button><button disabled={deletingId === u._id} onClick={() => remove(u)}>{deletingId === u._id ? 'Deleting…' : 'Delete'}</button></div> }] : []),
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
