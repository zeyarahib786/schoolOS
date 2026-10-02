import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import { useAuthStore } from '../../lib/store/authStore';
import * as expensesApi from './expenses.api';
import type { ExpenseClaim } from './expenses.api';
import { SubmitExpenseModal } from './SubmitExpenseModal';
import { ReviewExpenseModal } from './ReviewExpenseModal';

const statusTone: Record<ExpenseClaim['status'], 'green' | 'amber' | 'red'> = {
  Approved: 'green',
  Pending: 'amber',
  Rejected: 'red',
};

function staffLabel(staff: ExpenseClaim['staff']): string {
  return typeof staff === 'string' ? staff : `${staff.name} (${staff.refId})`;
}

function formatAmount(amount: number): string {
  return `AED ${amount.toLocaleString()}`;
}

export function ExpensesPage(): JSX.Element {
  const [items, setItems] = useState<ExpenseClaim[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [review, setReview] = useState<{ claim: ExpenseClaim; decision: expensesApi.ClaimDecision } | null>(null);
  const role = useAuthStore((s) => s.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await expensesApi.listClaims(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load expense claims - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const pendingCount = items.filter((c) => c.status === 'Pending').length;
  const totalApproved = items.filter((c) => c.status === 'Approved').reduce((s, c) => s + c.amount, 0);

  const isSelfService = role !== 'Administrator' && role !== 'Principal' && role !== 'Accountant';
  const canSubmit = role === 'Administrator' || role === 'Principal' || role === 'Teacher' || role === 'Accountant';
  const canReview = role === 'Administrator' || role === 'Principal' || role === 'Accountant';

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showSubmitModal && <SubmitExpenseModal onClose={() => setShowSubmitModal(false)} onCreated={() => load(page)} />}
      {review && <ReviewExpenseModal claim={review.claim} decision={review.decision} onClose={() => setReview(null)} onReviewed={() => load(page)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Expenses</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          {isSelfService ? 'Your own submitted claims.' : 'Expense claims awaiting review, and their outcomes.'}
        </p>
        </div>
        {canSubmit && <button onClick={() => setShowSubmitModal(true)} style={{ padding: '8px 12px', borderRadius: 8, border: 0, background: '#0E7C39', color: '#fff', whiteSpace: 'nowrap' }}>Submit claim</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Pending review" value={pendingCount} accentColor="#B45309" />
        <Kpi label="Approved total (this page)" value={formatAmount(totalApproved)} accentColor="#0E7C39" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<ExpenseClaim>
          keyField={(c) => c._id}
          rows={items}
          emptyLabel={isSelfService ? 'You have not submitted any expense claims yet.' : 'No expense claims found.'}
          columns={[
            { header: 'Staff', render: (c) => staffLabel(c.staff) },
            { header: 'Category', render: (c) => c.category },
            { header: 'Amount', render: (c) => formatAmount(c.amount), align: 'right' },
            { header: 'Date', render: (c) => new Date(c.expenseDate).toLocaleDateString() },
            { header: 'Status', render: (c) => <Chip label={c.status} tone={statusTone[c.status]} /> },
            ...(canReview ? [{
              header: 'Actions',
              render: (c: ExpenseClaim) => c.status !== 'Pending' ? <span style={{ color: '#64748B' }}>Reviewed</span> : <div style={{ display: 'flex', gap: 6 }}><button onClick={() => setReview({ claim: c, decision: 'Approved' })}>Approve</button><button onClick={() => setReview({ claim: c, decision: 'Rejected' })}>Reject</button></div>,
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
