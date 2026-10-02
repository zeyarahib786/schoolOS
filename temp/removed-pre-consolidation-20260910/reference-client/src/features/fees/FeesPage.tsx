import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import { useAuthStore } from '../../lib/store/authStore';
import * as feesApi from './fees.api';
import type { Invoice } from './fees.api';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { RecordPaymentModal } from './RecordPaymentModal';

const statusTone: Record<Invoice['status'], 'green' | 'amber' | 'red'> = {
  Paid: 'green',
  Pending: 'amber',
  Overdue: 'red',
};

function studentLabel(student: Invoice['student']): string {
  return typeof student === 'string' ? student : `${student.name} (${student.refId})`;
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString()}`;
}

export function FeesPage(): JSX.Element {
  const [items, setItems] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const role = useAuthStore((s) => s.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await feesApi.listInvoices(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load invoices - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const totalOutstanding = items.filter((i) => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const overdueCount = items.filter((i) => i.status === 'Overdue').length;
  const paidCount = items.filter((i) => i.status === 'Paid').length;

  const noEmptyDataHint = role === 'Teacher' || role === 'Parent' || role === 'Student';
  const isParentOrStudent = role === 'Parent' || role === 'Student';
  const canManage = role === 'Administrator' || role === 'Principal' || role === 'Accountant';

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showCreateModal && <CreateInvoiceModal onClose={() => setShowCreateModal(false)} onCreated={() => load(page)} />}
      {paymentInvoice && <RecordPaymentModal invoice={paymentInvoice} onClose={() => setPaymentInvoice(null)} onPaid={() => load(page)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Fees & Invoicing</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          {isParentOrStudent
            ? "Your child's invoices and payment status."
            : 'Invoices, payment status, and outstanding balances.'}
        </p>
        </div>
        {canManage && <button onClick={() => setShowCreateModal(true)} style={{ padding: '8px 12px', borderRadius: 8, border: 0, background: '#0E7C39', color: '#fff', whiteSpace: 'nowrap' }}>Create invoice</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Outstanding (this page)" value={formatAmount(totalOutstanding, 'AED')} accentColor="#B45309" />
        <Kpi label="Overdue" value={overdueCount} accentColor="#B42318" />
        <Kpi label="Paid" value={paidCount} accentColor="#0E7C39" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<Invoice>
          keyField={(i) => i._id}
          rows={items}
          emptyLabel={
            noEmptyDataHint
              ? 'No invoices are linked to your account yet - Fees & Invoicing shows only records tied to you or your child.'
              : 'No invoices found.'
          }
          columns={[
            { header: 'Reference', render: (i) => i.refId },
            { header: 'Student', render: (i) => studentLabel(i.student) },
            { header: 'Term', render: (i) => i.term },
            { header: 'Amount', render: (i) => formatAmount(i.amount, i.currency), align: 'right' },
            { header: 'Due', render: (i) => new Date(i.dueDate).toLocaleDateString() },
            { header: 'Status', render: (i) => <Chip label={i.status} tone={statusTone[i.status]} /> },
            ...(canManage ? [{
              header: 'Actions',
              render: (i: Invoice) => i.status === 'Paid'
                ? <span style={{ color: '#64748B' }}>{i.paymentMethod ?? 'Paid'}</span>
                : <button onClick={() => setPaymentInvoice(i)}>Record payment</button>,
            }] : []),
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
