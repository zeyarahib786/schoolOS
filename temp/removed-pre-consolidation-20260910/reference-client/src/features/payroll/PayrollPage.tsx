import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import { useAuthStore } from '../../lib/store/authStore';
import * as payrollApi from './payroll.api';
import type { Payslip } from './payroll.api';
import { GeneratePayslipModal } from './GeneratePayslipModal';

const statusTone: Record<Payslip['status'], 'green' | 'amber' | 'blue'> = {
  Paid: 'green',
  Processed: 'amber',
  Draft: 'blue',
};

function staffLabel(staff: Payslip['staff']): string {
  return typeof staff === 'string' ? staff : `${staff.name} (${staff.refId})`;
}

function formatAmount(amount: number): string {
  return `AED ${amount.toLocaleString()}`;
}

export function PayrollPage(): JSX.Element {
  const [items, setItems] = useState<Payslip[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const role = useAuthStore((s) => s.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await payrollApi.listPayslips(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load payroll - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const totalNetPay = items.reduce((s, p) => s + p.netPay, 0);
  const paidCount = items.filter((p) => p.status === 'Paid').length;

  const isSelfService = role !== 'Administrator' && role !== 'Principal' && role !== 'Accountant';

  async function markPaid(payslip: Payslip) {
    setPayingId(payslip._id); setError(null);
    try { await payrollApi.markPayslipPaid(payslip._id); await load(page); }
    catch { setError('Could not mark payslip as paid. It may already be paid.'); }
    finally { setPayingId(null); }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showGenerate && <GeneratePayslipModal onClose={() => setShowGenerate(false)} onSaved={() => load(page)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Payroll</h1><p style={{ fontSize: 12.5, color: '#64748B' }}>{isSelfService ? 'Your own payslips.' : 'Staff payslips, net pay, and payment status.'}</p></div>
        {!isSelfService && <button onClick={() => setShowGenerate(true)} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap' }}>Process payslip</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Total net pay (this page)" value={formatAmount(totalNetPay)} accentColor="#0E7C39" />
        <Kpi label="Paid" value={paidCount} accentColor="#2563EB" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<Payslip>
          keyField={(p) => p._id}
          rows={items}
          emptyLabel={isSelfService ? 'No payslips are linked to your account yet.' : 'No payslips found.'}
          columns={[
            { header: 'Staff', render: (p) => staffLabel(p.staff) },
            { header: 'Month', render: (p) => p.month },
            { header: 'Net pay', render: (p) => formatAmount(p.netPay), align: 'right' },
            { header: 'Status', render: (p) => <Chip label={p.status} tone={statusTone[p.status]} /> },
            ...(!isSelfService ? [{ header: 'Actions', render: (p: Payslip) => p.status === 'Paid' ? <span style={{ color: '#64748B', fontSize: 12 }}>{p.paidDate ? new Date(p.paidDate).toLocaleDateString() : 'Paid'}</span> : <button disabled={payingId === p._id} onClick={() => markPaid(p)}>{payingId === p._id ? 'Saving…' : 'Mark paid'}</button> }] : []),
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
