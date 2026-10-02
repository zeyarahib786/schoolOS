import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import { useAuthStore } from '../../lib/store/authStore';
import * as idcardsApi from './idcards.api';
import type { IdCard } from './idcards.api';
import { IssueIdCardModal } from './IssueIdCardModal';

const statusTone: Record<IdCard['status'], 'green' | 'amber' | 'red'> = {
  Active: 'green',
  Lost: 'amber',
  Revoked: 'red',
};

function holderLabel(card: IdCard): string {
  if (!card.subject || typeof card.subject === 'string') return '—';
  return `${card.subject.name} (${card.subject.refId})`;
}

export function IdCardsPage(): JSX.Element {
  const [items, setItems] = useState<IdCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIssue, setShowIssue] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const role = useAuthStore((s) => s.user?.role);
  const isStaff = role === 'Administrator' || role === 'Principal' || role === 'Teacher';

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await idcardsApi.listCards(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load ID cards - Administrator, Principal, or Teacher access is required');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStaff) load(page);
    else setLoading(false);
  }, [page, load, isStaff]);

  const activeCount = items.filter((c) => c.status === 'Active').length;

  async function changeStatus(card: IdCard, action: 'lost' | 'revoke') {
    const verb = action === 'lost' ? 'report this card as lost' : 'revoke this card';
    if (!window.confirm(`Are you sure you want to ${verb}?`)) return;
    setOperationId(card._id); setError(null);
    try { if (action === 'lost') await idcardsApi.reportCardLost(card._id); else await idcardsApi.revokeCard(card._id); await load(page); }
    catch { setError('Could not update card status. Only an active card can be reported lost or revoked.'); }
    finally { setOperationId(null); }
  }

  if (!isStaff) {
    return (
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>ID Cards</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          The card registry is internal staff work and isn't visible to your role.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showIssue && <IssueIdCardModal onClose={() => setShowIssue(false)} onSaved={() => load(page)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>ID Cards</h1><p style={{ fontSize: 12.5, color: '#64748B' }}>One registry for student and staff cards - one active card per holder, replacements linked to what they replace.</p></div>
        <button onClick={() => setShowIssue(true)} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap' }}>Issue card</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Cards (this page)" value={total} accentColor="#0E7C39" />
        <Kpi label="Active on this page" value={activeCount} accentColor="#2563EB" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<IdCard>
          keyField={(c) => c._id}
          rows={items}
          emptyLabel="No cards issued yet."
          columns={[
            { header: 'Serial', render: (c) => c.serial },
            { header: 'Holder', render: (c) => holderLabel(c) },
            {
              header: 'Kind',
              render: (c) => <Chip label={c.subjectType} tone={c.subjectType === 'Student' ? 'blue' : 'gray'} />,
            },
            { header: 'Expires', render: (c) => new Date(c.expiryDate).toLocaleDateString() },
            { header: 'Status', render: (c) => <Chip label={c.status} tone={statusTone[c.status]} /> },
            { header: 'Actions', render: (c) => c.status === 'Active' ? <div style={{ display: 'flex', gap: 6 }}><button disabled={operationId === c._id} onClick={() => changeStatus(c, 'lost')}>Report lost</button><button disabled={operationId === c._id} onClick={() => changeStatus(c, 'revoke')}>{operationId === c._id ? 'Saving…' : 'Revoke'}</button></div> : '—' },
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
