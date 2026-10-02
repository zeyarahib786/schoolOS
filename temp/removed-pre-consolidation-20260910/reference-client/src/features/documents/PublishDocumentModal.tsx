import { FormEvent, useState } from 'react';
import * as api from './documents.api';

interface Props { onClose: () => void; onSaved: () => void }

export function PublishDocumentModal({ onClose, onSaved }: Props): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError(null);
    try { await api.publishDocument({ code: String(data.get('code')).toUpperCase(), title: String(data.get('title')), category: String(data.get('category')) as api.SchoolDocument['category'], description: String(data.get('description')) }); onSaved(); onClose(); }
    catch { setError('Could not publish document. Use a code such as POL-001 and retry if another version was published concurrently.'); }
    finally { setBusy(false); }
  }
  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return <div role="dialog" aria-modal="true" aria-labelledby="publish-document-title" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}><form onSubmit={submit} style={{ width: 'min(540px,calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}><h2 id="publish-document-title">Publish document record</h2><p style={{ color: '#64748B', fontSize: 12.5 }}>This module stores controlled document metadata, not a file upload. Reusing a code creates the next version and supersedes its current version.</p><div style={{ display: 'grid', gap: 10 }}><input name="code" required pattern="[A-Za-z]{2,5}-[0-9]{2,5}" maxLength={11} placeholder="Code, e.g. POL-001" style={field}/><input name="title" required minLength={2} maxLength={160} placeholder="Document title" style={field}/><select name="category" required defaultValue="Policy" style={field}><option>Policy</option><option>Form</option><option>Circular</option><option>Guideline</option></select><textarea name="description" required maxLength={2000} placeholder="Summary / document content reference" style={{ ...field, height: 130, padding: 10 }}/></div>{error && <p role="alert" style={{ color: '#B42318', fontSize: 12.5 }}>{error}</p>}<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose}>Cancel</button><button disabled={busy} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{busy ? 'Publishing…' : 'Publish'}</button></div></form></div>;
}
