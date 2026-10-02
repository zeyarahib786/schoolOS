import { FormEvent, useState } from 'react';
import * as leaveApi from './leave.api';

interface Props { onClose: () => void; onCreated: () => void }

export function RequestLeaveModal({ onClose, onCreated }: Props): JSX.Element {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      await leaveApi.requestLeave({
        fromDate: String(data.get('fromDate')),
        toDate: String(data.get('toDate')),
        reason: String(data.get('reason')),
      });
      onCreated();
      onClose();
    } catch {
      setError('Could not submit leave. Your account must be linked to a staff record and dates must be valid.');
    } finally { setSubmitting(false); }
  }
  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return (
    <div role="dialog" aria-modal="true" aria-label="Request leave" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
      <form onSubmit={submit} style={{ width: 'min(480px, calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 17 }}>Request leave</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ fontSize: 12 }}>From<input name="fromDate" type="date" required style={{ ...field, width: '100%', marginTop: 4 }} /></label>
          <label style={{ fontSize: 12 }}>To<input name="toDate" type="date" required style={{ ...field, width: '100%', marginTop: 4 }} /></label>
          <textarea name="reason" required minLength={3} maxLength={500} placeholder="Reason" style={{ gridColumn: '1 / -1', minHeight: 90, borderRadius: 8, border: '1px solid #E2E8F0', padding: 10 }} />
        </div>
        {error && <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" disabled={submitting} style={{ padding: '7px 12px', borderRadius: 8, border: 0, background: '#0E7C39', color: '#fff' }}>{submitting ? 'Submitting…' : 'Submit request'}</button>
        </div>
      </form>
    </div>
  );
}
