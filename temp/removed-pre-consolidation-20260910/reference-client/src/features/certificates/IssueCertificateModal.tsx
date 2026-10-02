import { FormEvent, useEffect, useState } from 'react';
import * as studentsApi from '../students/students.api';
import * as api from './certificates.api';

interface Props { onClose: () => void; onSaved: () => void }

export function IssueCertificateModal({ onClose, onSaved }: Props): JSX.Element {
  const [students, setStudents] = useState<studentsApi.Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { studentsApi.listStudents(1, '', { limit: 100 }).then((result) => setStudents(result.items)).catch(() => setError('Could not load students.')).finally(() => setLoadingStudents(false)); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const purpose = String(data.get('purpose') ?? '').trim() || undefined; setBusy(true); setError(null);
    try { await api.issueCertificate({ studentId: String(data.get('studentId')), type: String(data.get('type')) as api.Certificate['type'], purpose }); onSaved(); onClose(); }
    catch { setError('Could not issue certificate. Check the student, details, and permissions.'); }
    finally { setBusy(false); }
  }
  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return <div role="dialog" aria-modal="true" aria-labelledby="issue-certificate-title" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}><form onSubmit={submit} style={{ width: 'min(520px,calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}><h2 id="issue-certificate-title">Issue certificate</h2><p style={{ color: '#64748B', fontSize: 12.5 }}>A unique sequential certificate reference will be generated automatically.</p><div style={{ display: 'grid', gap: 10 }}><select name="studentId" required defaultValue="" style={field}><option value="">Select student</option>{students.map((student) => <option key={student._id} value={student._id}>{student.name} · {student.refId} · {student.grade} · {student.status}</option>)}</select><select name="type" required defaultValue="Bonafide" style={field}><option>Bonafide</option><option>Transfer</option><option>Character</option><option>Study</option></select><textarea name="purpose" maxLength={300} placeholder="Purpose (optional)" style={{ ...field, height: 90, padding: 10 }}/></div>{error && <p role="alert" style={{ color: '#B42318', fontSize: 12.5 }}>{error}</p>}<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose}>Cancel</button><button disabled={busy || loadingStudents || students.length === 0} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{busy ? 'Issuing…' : loadingStudents ? 'Loading…' : 'Issue certificate'}</button></div></form></div>;
}
