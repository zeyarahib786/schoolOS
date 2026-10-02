import { FormEvent, useState } from 'react';
import * as feesApi from './fees.api';
import type { Invoice } from './fees.api';

interface Props { invoice: Invoice; onClose: () => void; onPaid: () => void }

export function RecordPaymentModal({ invoice, onClose, onPaid }: Props): JSX.Element {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const paymentMethod = new FormData(event.currentTarget).get('paymentMethod') as feesApi.PaymentMethod;
    setSubmitting(true);
    setError(null);
    try { await feesApi.recordPayment(invoice._id, paymentMethod); onPaid(); onClose(); }
    catch { setError('Could not record payment. Refresh and try again.'); }
    finally { setSubmitting(false); }
  }
  return (
    <div role="dialog" aria-modal="true" aria-label="Record payment" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
      <form onSubmit={submit} style={{ width: 'min(420px, calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 17 }}>Record payment</h2>
        <p style={{ color: '#64748B', fontSize: 12.5 }}>{invoice.refId} · {invoice.currency} {invoice.amount.toLocaleString()}</p>
        <select name="paymentMethod" defaultValue="Online portal" style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' }}>
          <option>Card</option><option>Bank transfer</option><option>Cash</option><option>Cheque</option><option>Online portal</option>
        </select>
        {error && <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" disabled={submitting} style={{ padding: '7px 12px', borderRadius: 8, border: 0, background: '#0E7C39', color: '#fff' }}>{submitting ? 'Saving…' : 'Confirm payment'}</button>
        </div>
      </form>
    </div>
  );
}
