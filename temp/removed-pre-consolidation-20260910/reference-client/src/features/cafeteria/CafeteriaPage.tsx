import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import * as cafeteriaApi from './cafeteria.api';
import type { CafeteriaWallet } from './cafeteria.api';
import { WalletActionModal } from './WalletActionModal';
import { useAuthStore } from '../../lib/store/authStore';

function studentLabel(student: CafeteriaWallet['student']): string {
  return typeof student === 'string' ? student : `${student.name} (${student.refId})`;
}

function formatAmount(amount: number): string {
  return `AED ${amount.toLocaleString()}`;
}

export function CafeteriaPage(): JSX.Element {
  const [items, setItems] = useState<CafeteriaWallet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: 'topup' | 'purchase'; wallet?: CafeteriaWallet } | null>(null);
  const role = useAuthStore((state) => state.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await cafeteriaApi.listWallets(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load cafeteria wallets - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const totalBalance = items.reduce((s, w) => s + w.balance, 0);
  const lowBalanceCount = items.filter((w) => w.balance < 10).length;
  const canManage = role === 'Administrator' || role === 'Principal' || role === 'Accountant';

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {modal && <WalletActionModal mode={modal.mode} wallet={modal.wallet} onClose={() => setModal(null)} onSaved={() => load(page)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Cafeteria</h1><p style={{ fontSize: 12.5, color: '#64748B' }}>Wallet balances - purchases are balance-guarded, never going negative.</p></div>
        {canManage && <button onClick={() => setModal({ mode: 'topup' })} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap' }}>Top up wallet</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Total balance (this page)" value={formatAmount(totalBalance)} accentColor="#0E7C39" />
        <Kpi label="Low balance (< AED 10)" value={lowBalanceCount} accentColor="#B45309" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<CafeteriaWallet>
          keyField={(w) => w._id}
          rows={items}
          emptyLabel="No wallets found."
          columns={[
            { header: 'Student', render: (w) => studentLabel(w.student) },
            { header: 'Balance', render: (w) => formatAmount(w.balance), align: 'right' },
            {
              header: 'Status',
              render: (w) => <Chip label={w.balance < 10 ? 'Low' : 'OK'} tone={w.balance < 10 ? 'amber' : 'green'} />,
            },
            ...(canManage ? [{ header: 'Actions', render: (w: CafeteriaWallet) => <div style={{ display: 'flex', gap: 6 }}><button onClick={() => setModal({ mode: 'topup', wallet: w })}>Top up</button><button disabled={w.balance <= 0} onClick={() => setModal({ mode: 'purchase', wallet: w })}>Purchase</button></div> }] : []),
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
