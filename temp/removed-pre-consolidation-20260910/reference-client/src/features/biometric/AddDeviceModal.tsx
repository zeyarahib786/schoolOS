import { FormEvent, useState } from 'react';
import * as api from './biometric.api';

interface Props { onClose: () => void; onSaved: () => void }

export function AddDeviceModal({ onClose, onSaved }: Props): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError(null);
    try {
      await api.createDevice({ name: String(data.get('name')), location: String(data.get('location')) });
      onSaved(); onClose();
    } catch { setError('Could not register device. The device name may already exist.'); }
    finally { setBusy(false); }
  }

  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return <div role="dialog" aria-modal="true" aria-labelledby="add-device-title" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
    <form onSubmit={submit} style={{ width: 'min(500px,calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}>
      <h2 id="add-device-title">Register biometric device</h2>
      <div style={{ display: 'grid', gap: 10 }}><input name="name" required maxLength={120} placeholder="Device name" style={field} /><input name="location" required maxLength={160} placeholder="Device location" style={field} /></div>
      <p style={{ color: '#64748B', fontSize: 12.5 }}>New devices start Offline. Use Sync after registration to mark a successful connection.</p>
      {error && <p role="alert" style={{ color: '#B42318', fontSize: 12.5 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose}>Cancel</button><button disabled={busy} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{busy ? 'Registering…' : 'Register device'}</button></div>
    </form>
  </div>;
}
