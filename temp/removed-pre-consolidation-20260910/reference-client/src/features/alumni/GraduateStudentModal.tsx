import { FormEvent, useEffect, useState } from 'react';
import * as studentsApi from '../students/students.api';
import * as alumniApi from './alumni.api';

interface Props { onClose: () => void; onSaved: () => void }

export function GraduateStudentModal({ onClose, onSaved }: Props): JSX.Element {
  const [students, setStudents] = useState<studentsApi.Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    studentsApi.listStudents(1, '', { limit: 100, status: 'Active' }).then((result) => setStudents(result.items)).catch(() => setError('Could not load active students.')).finally(() => setLoadingStudents(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const optional = (name: string) => String(data.get(name) ?? '').trim() || undefined;
    setBusy(true); setError(null);
    try {
      await alumniApi.graduateStudent({ studentId: String(data.get('studentId')), graduationYear: Number(data.get('graduationYear')), currentEmployer: optional('currentEmployer'), contactEmail: optional('contactEmail'), notes: optional('notes') });
      onSaved(); onClose();
    } catch { setError('Could not graduate student. They may already be an alumnus, or the details may be invalid.'); }
    finally { setBusy(false); }
  }

  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return <div role="dialog" aria-modal="true" aria-labelledby="graduate-title" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
    <form onSubmit={submit} style={{ width: 'min(520px,calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', overflow: 'auto', background: '#fff', borderRadius: 14, padding: 20 }}>
      <h2 id="graduate-title">Graduate student</h2>
      <p style={{ fontSize: 12.5, color: '#64748B' }}>This atomically changes the student status to Alumni and creates their alumni profile.</p>
      <div style={{ display: 'grid', gap: 10 }}><select name="studentId" required defaultValue="" style={field}><option value="">Select active student</option>{students.map((student) => <option key={student._id} value={student._id}>{student.name} · {student.refId} · {student.grade}</option>)}</select><input name="graduationYear" type="number" required min="1990" max="2100" defaultValue={new Date().getFullYear()} placeholder="Graduation year" style={field} /><input name="currentEmployer" maxLength={200} placeholder="Current employer (optional)" style={field} /><input name="contactEmail" type="email" placeholder="Contact email (optional)" style={field} /><textarea name="notes" maxLength={1000} placeholder="Notes (optional)" style={{ ...field, height: 80, padding: 10 }} /></div>
      {error && <p role="alert" style={{ color: '#B42318', fontSize: 12.5 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose}>Cancel</button><button disabled={busy || loadingStudents || students.length === 0} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{busy ? 'Graduating…' : loadingStudents ? 'Loading…' : 'Graduate student'}</button></div>
    </form>
  </div>;
}
