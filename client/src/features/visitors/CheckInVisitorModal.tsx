import { FormEvent, useState } from 'react';
import * as api from './visitors.api';

interface Props { onClose: () => void; onSaved: () => void }

export function CheckInVisitorModal({ onClose, onSaved }: Props): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError(null);
    try {
      await api.checkInVisitor({ visitorName: String(data.get('visitorName')), purpose: String(data.get('purpose')), hostName: String(data.get('hostName')) });
      onSaved(); onClose();
    } catch { setError('Visitor check-in failed. Check the details and your permissions.'); }
    finally { setBusy(false); }
  }

  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return <div role="dialog" aria-modal="true" aria-labelledby="check-in-title" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
    <form onSubmit={submit} style={{ width: 'min(500px,calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}>
      <h2 id="check-in-title">Check in visitor</h2>
      <div style={{ display: 'grid', gap: 10 }}><input name="visitorName" required minLength={2} maxLength={160} placeholder="Visitor name" style={field} /><input name="hostName" required minLength={2} maxLength={160} placeholder="Host / person being visited" style={field} /><textarea name="purpose" required maxLength={300} placeholder="Purpose of visit" style={{ ...field, height: 90, padding: 10 }} /></div>
      {error && <p role="alert" style={{ color: '#B42318', fontSize: 12.5 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose}>Cancel</button><button disabled={busy} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{busy ? 'Checking in…' : 'Check in'}</button></div>
    </form>
  </div>;
}
