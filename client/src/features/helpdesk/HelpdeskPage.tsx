import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import * as helpdeskApi from './helpdesk.api';
import type { Ticket } from './helpdesk.api';
import { RaiseTicketModal } from './RaiseTicketModal';
import { TransitionTicketModal } from './TransitionTicketModal';
import { useAuthStore } from '../../lib/store/authStore';

const statusTone: Record<Ticket['status'], 'blue' | 'amber' | 'green' | 'gray'> = {
  Open: 'blue',
  Assigned: 'amber',
  Resolved: 'green',
  Closed: 'gray',
};

const priorityTone: Record<Ticket['priority'], 'gray' | 'blue' | 'amber' | 'red'> = {
  Low: 'gray',
  Medium: 'blue',
  High: 'amber',
  Urgent: 'red',
};

function raiserLabel(raisedBy: Ticket['raisedBy']): string {
  return typeof raisedBy === 'string' ? raisedBy : raisedBy.name;
}

export function HelpdeskPage(): JSX.Element {
  const [items, setItems] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [transitionTicket, setTransitionTicket] = useState<Ticket | null>(null);
  const role = useAuthStore((state) => state.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await helpdeskApi.listTickets(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load tickets - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const openCount = items.filter((t) => t.status === 'Open').length;
  const urgentCount = items.filter((t) => t.priority === 'Urgent' && t.status !== 'Closed').length;
  const canTransition = role === 'Administrator' || role === 'Principal' || role === 'Teacher';

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showRaiseModal && <RaiseTicketModal onClose={() => setShowRaiseModal(false)} onCreated={() => load(page)} />}
      {transitionTicket && <TransitionTicketModal ticket={transitionTicket} onClose={() => setTransitionTicket(null)} onUpdated={() => load(page)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Helpdesk</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          Support tickets - anyone can raise one; support staff triage and resolve.
        </p>
        </div>
        <button onClick={() => setShowRaiseModal(true)} style={{ padding: '8px 12px', borderRadius: 8, border: 0, background: '#0E7C39', color: '#fff', whiteSpace: 'nowrap' }}>Raise ticket</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Open (this page)" value={openCount} accentColor="#2563EB" />
        <Kpi label="Urgent & unresolved" value={urgentCount} accentColor="#B42318" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<Ticket>
          keyField={(t) => t._id}
          rows={items}
          emptyLabel="No tickets found."
          columns={[
            { header: 'Subject', render: (t) => t.subject },
            { header: 'Category', render: (t) => t.category },
            { header: 'Raised by', render: (t) => raiserLabel(t.raisedBy) },
            { header: 'Priority', render: (t) => <Chip label={t.priority} tone={priorityTone[t.priority]} /> },
            { header: 'Status', render: (t) => <Chip label={t.status} tone={statusTone[t.status]} /> },
            ...(canTransition ? [{
              header: 'Actions',
              render: (t: Ticket) => t.status === 'Closed' ? <span style={{ color: '#64748B' }}>Closed</span> : <button onClick={() => setTransitionTicket(t)}>Update</button>,
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
