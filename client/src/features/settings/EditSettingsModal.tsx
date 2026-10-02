import { FormEvent, useState } from 'react';
import * as api from './settings.api';

interface Props { settings: api.SchoolSettings; onClose: () => void; onSaved: () => void }

export function EditSettingsModal({ settings, onClose, onSaved }: Props): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError(null);
    try { await api.updateSettings({ schoolName: String(data.get('schoolName')), academicYear: String(data.get('academicYear')), timezone: String(data.get('timezone')), currency: String(data.get('currency')).toUpperCase(), defaultAnnualLeave: Number(data.get('defaultAnnualLeave')) }); onSaved(); onClose(); }
    catch { setError('Could not save settings. Check the academic year, currency, timezone, and leave allowance.'); }
    finally { setBusy(false); }
  }
  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return <div role="dialog" aria-modal="true" aria-labelledby="edit-settings-title" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}><form onSubmit={submit} style={{ width: 'min(520px,calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}><h2 id="edit-settings-title">Edit school settings</h2><p style={{ color: '#64748B', fontSize: 12.5 }}>These school-wide changes are recorded in the audit log.</p><div style={{ display: 'grid', gap: 10 }}><label style={{ display: 'grid', gap: 4, fontSize: 12.5 }}>School name<input name="schoolName" required minLength={2} maxLength={160} defaultValue={settings.schoolName} style={field}/></label><label style={{ display: 'grid', gap: 4, fontSize: 12.5 }}>Academic year<input name="academicYear" required pattern="[0-9]{4}-[0-9]{4}" defaultValue={settings.academicYear} placeholder="2026-2027" style={field}/></label><label style={{ display: 'grid', gap: 4, fontSize: 12.5 }}>IANA timezone<input name="timezone" required maxLength={60} defaultValue={settings.timezone} placeholder="Asia/Dubai" style={field}/></label><label style={{ display: 'grid', gap: 4, fontSize: 12.5 }}>Currency code<input name="currency" required minLength={3} maxLength={3} defaultValue={settings.currency} placeholder="AED" style={field}/></label><label style={{ display: 'grid', gap: 4, fontSize: 12.5 }}>Default annual leave (days)<input name="defaultAnnualLeave" type="number" required min="0" max="365" step="1" defaultValue={settings.defaultAnnualLeave} style={field}/></label></div>{error && <p role="alert" style={{ color: '#B42318', fontSize: 12.5 }}>{error}</p>}<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose}>Cancel</button><button disabled={busy} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{busy ? 'Saving…' : 'Save settings'}</button></div></form></div>;
}
