import { FormEvent, useState } from 'react';
import * as expensesApi from './expenses.api';
import type { ExpenseClaim } from './expenses.api';

interface Props { claim: ExpenseClaim; decision: expensesApi.ClaimDecision; onClose: () => void; onReviewed: () => void }

export function ReviewExpenseModal({ claim, decision, onClose, onReviewed }: Props): JSX.Element {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const notes = String(new FormData(event.currentTarget).get('reviewNotes') ?? '') || undefined;
    setSubmitting(true); setError(null);
    try { await expensesApi.reviewClaim(claim._id, decision, notes); onReviewed(); onClose(); }
    catch { setError('Could not review this claim. It may already be reviewed or be your own claim.'); }
    finally { setSubmitting(false); }
  }
  return <div role="dialog" aria-modal="true" aria-label={`${decision} expense claim`} style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
    <form onSubmit={submit} style={{ width: 'min(420px, calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 17 }}>{decision === 'Approved' ? 'Approve' : 'Reject'} claim</h2>
      <p style={{ color: '#64748B', fontSize: 12.5 }}>{claim.category} · AED {claim.amount.toLocaleString()}</p>
      <textarea name="reviewNotes" maxLength={500} placeholder="Review notes (optional)" style={{ width: '100%', minHeight: 90, borderRadius: 8, border: '1px solid #E2E8F0', padding: 10 }} />
      {error && <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginTop: 12 }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose} disabled={submitting}>Cancel</button><button type="submit" disabled={submitting} style={{ padding: '7px 12px', borderRadius: 8, border: 0, background: decision === 'Approved' ? '#0E7C39' : '#B42318', color: '#fff' }}>{submitting ? 'Saving…' : 'Confirm'}</button></div>
    </form>
  </div>;
}
