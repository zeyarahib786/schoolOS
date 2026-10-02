import { FormEvent, useState } from 'react';
import * as helpdeskApi from './helpdesk.api';

interface Props { onClose: () => void; onCreated: () => void }

export function RaiseTicketModal({ onClose, onCreated }: Props): JSX.Element {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    setSubmitting(true); setError(null);
    try {
      await helpdeskApi.raiseTicket({ category: String(data.get('category')), subject: String(data.get('subject')), description: String(data.get('description')), priority: String(data.get('priority')) as helpdeskApi.Ticket['priority'] });
      onCreated(); onClose();
    } catch { setError('Could not raise ticket. Check the details and try again.'); }
    finally { setSubmitting(false); }
  }
  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return <div role="dialog" aria-modal="true" aria-label="Raise ticket" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}><form onSubmit={submit} style={{ width: 'min(500px, calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}>
    <h2 style={{ margin: '0 0 16px', fontSize: 17 }}>Raise support ticket</h2>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <input name="category" required placeholder="Category" style={field} /><select name="priority" defaultValue="Medium" style={field}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select>
      <input name="subject" required minLength={2} maxLength={160} placeholder="Subject" style={{ ...field, gridColumn: '1 / -1' }} />
      <textarea name="description" required maxLength={2000} placeholder="Describe the issue" style={{ gridColumn: '1 / -1', minHeight: 100, borderRadius: 8, border: '1px solid #E2E8F0', padding: 10 }} />
    </div>
    {error && <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginTop: 12 }}>{error}</div>}
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose} disabled={submitting}>Cancel</button><button type="submit" disabled={submitting} style={{ padding: '7px 12px', borderRadius: 8, border: 0, background: '#0E7C39', color: '#fff' }}>{submitting ? 'Submitting…' : 'Raise ticket'}</button></div>
  </form></div>;
}
