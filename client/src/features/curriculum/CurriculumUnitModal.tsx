import { FormEvent, useState } from 'react';
import * as api from './curriculum.api';

interface Props { unit?: api.CurriculumUnit; onClose: () => void; onSaved: () => void }

export function CurriculumUnitModal({ unit, onClose, onSaved }: Props): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError(null);
    const input = { subject: String(data.get('subject')), term: String(data.get('term')), title: String(data.get('title')), outcomes: String(data.get('outcomes')), sequenceOrder: Number(data.get('sequenceOrder')) };
    try { if (unit) await api.updateUnit(unit._id, input); else await api.createUnit(input); onSaved(); onClose(); }
    catch { setError(`Could not ${unit ? 'update' : 'create'} curriculum unit. Check the details and permissions.`); }
    finally { setBusy(false); }
  }
  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return <div role="dialog" aria-modal="true" aria-labelledby="unit-modal-title" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}><form onSubmit={submit} style={{ width: 'min(540px,calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', overflow: 'auto', background: '#fff', borderRadius: 14, padding: 20 }}><h2 id="unit-modal-title">{unit ? 'Edit curriculum unit' : 'Add curriculum unit'}</h2><div style={{ display: 'grid', gap: 10 }}><input name="subject" required maxLength={80} defaultValue={unit?.subject} placeholder="Subject" style={field}/><input name="term" required maxLength={60} defaultValue={unit?.term} placeholder="Term" style={field}/><input name="title" required minLength={2} maxLength={160} defaultValue={unit?.title} placeholder="Unit title" style={field}/><textarea name="outcomes" required maxLength={2000} defaultValue={unit?.outcomes} placeholder="Learning outcomes" style={{ ...field, height: 130, padding: 10 }}/><input name="sequenceOrder" type="number" min="0" step="1" required defaultValue={unit?.sequenceOrder ?? 0} placeholder="Sequence order" style={field}/></div>{error && <p role="alert" style={{ color: '#B42318', fontSize: 12.5 }}>{error}</p>}<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose}>Cancel</button><button disabled={busy} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{busy ? 'Saving…' : unit ? 'Save changes' : 'Add unit'}</button></div></form></div>;
}
