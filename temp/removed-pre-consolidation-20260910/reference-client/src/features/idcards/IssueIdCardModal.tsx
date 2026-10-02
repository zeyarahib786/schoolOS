import { FormEvent, useEffect, useState } from 'react';
import * as studentsApi from '../students/students.api';
import * as staffApi from '../staff/staff.api';
import * as api from './idcards.api';

interface Props { onClose: () => void; onSaved: () => void }

export function IssueIdCardModal({ onClose, onSaved }: Props): JSX.Element {
  const [subjectType, setSubjectType] = useState<api.IdCard['subjectType']>('Student');
  const [students, setStudents] = useState<studentsApi.Student[]>([]);
  const [staff, setStaff] = useState<staffApi.StaffMember[]>([]);
  const [loadingHolders, setLoadingHolders] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { Promise.all([studentsApi.listStudents(1, '', { limit: 100, status: 'Active' }), staffApi.listStaff(1, '', { limit: 100, status: 'Active' })]).then(([studentResult, staffResult]) => { setStudents(studentResult.items); setStaff(staffResult.items); }).catch(() => setError('Could not load card holders.')).finally(() => setLoadingHolders(false)); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError(null);
    try { await api.issueCard({ subjectType, subjectId: String(data.get('subjectId')), expiryDate: String(data.get('expiryDate')) }); onSaved(); onClose(); }
    catch { setError('Could not issue card. The holder may already have an active card, or the expiry date is not in the future.'); }
    finally { setBusy(false); }
  }
  const holders = subjectType === 'Student' ? students : staff;
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return <div role="dialog" aria-modal="true" aria-labelledby="issue-card-title" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}><form onSubmit={submit} style={{ width: 'min(520px,calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}><h2 id="issue-card-title">Issue ID card</h2><p style={{ color: '#64748B', fontSize: 12.5 }}>Only one active card is allowed per holder. A new card after Lost/Revoked is automatically linked as its replacement.</p><div style={{ display: 'grid', gap: 10 }}><select value={subjectType} onChange={(event) => setSubjectType(event.target.value as api.IdCard['subjectType'])} style={field}><option>Student</option><option>Staff</option></select><select key={subjectType} name="subjectId" required defaultValue="" style={field}><option value="">Select active {subjectType.toLowerCase()}</option>{holders.map((holder) => <option key={holder._id} value={holder._id}>{holder.name} · {holder.refId}</option>)}</select><input name="expiryDate" type="date" min={tomorrow} required style={field}/></div>{error && <p role="alert" style={{ color: '#B42318', fontSize: 12.5 }}>{error}</p>}<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose}>Cancel</button><button disabled={busy || loadingHolders || holders.length === 0} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{busy ? 'Issuing…' : loadingHolders ? 'Loading…' : 'Issue card'}</button></div></form></div>;
}
