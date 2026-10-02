import { FormEvent, useState } from 'react';
import * as expensesApi from './expenses.api';

interface Props { onClose: () => void; onCreated: () => void }

export function SubmitExpenseModal({ onClose, onCreated }: Props): JSX.Element {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmitting(true); setError(null);
    try {
      await expensesApi.submitClaim({ category: String(data.get('category')), amount: Number(data.get('amount')), description: String(data.get('description')), expenseDate: String(data.get('expenseDate')) });
      onCreated(); onClose();
    } catch { setError('Could not submit claim. Your account must be linked to a staff record.'); }
    finally { setSubmitting(false); }
  }
  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return <div role="dialog" aria-modal="true" aria-label="Submit expense claim" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
    <form onSubmit={submit} style={{ width: 'min(480px, calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 17 }}>Submit expense claim</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <input name="category" required placeholder="Category" style={field} />
        <input name="amount" type="number" min="0.01" step="0.01" required placeholder="Amount (AED)" style={field} />
        <input name="expenseDate" type="date" required style={{ ...field, gridColumn: '1 / -1' }} />
        <textarea name="description" required maxLength={500} placeholder="Description" style={{ gridColumn: '1 / -1', minHeight: 90, borderRadius: 8, border: '1px solid #E2E8F0', padding: 10 }} />
      </div>
      {error && <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginTop: 12 }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose} disabled={submitting}>Cancel</button><button type="submit" disabled={submitting} style={{ padding: '7px 12px', borderRadius: 8, border: 0, background: '#0E7C39', color: '#fff' }}>{submitting ? 'Submitting…' : 'Submit claim'}</button></div>
    </form>
  </div>;
}
