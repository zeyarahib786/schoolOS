import { FormEvent, useState } from 'react';
import * as api from './staff.api';

interface Props { member: api.StaffMember; onClose: () => void; onSaved: () => void }

export function EditStaffModal({ member, onClose, onSaved }: Props): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError(null);
    try { await api.updateStaff(member._id, { refId: String(data.get('refId')), name: String(data.get('name')), designation: String(data.get('designation')), department: String(data.get('department')), type: String(data.get('type')) as api.StaffMember['type'], email: String(data.get('email')), phone: String(data.get('phone')), joinedDate: String(data.get('joinedDate')) }); onSaved(); onClose(); }
    catch { setError('Could not update staff record. Reference or email may already belong to another member.'); }
    finally { setBusy(false); }
  }
  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return <div role="dialog" aria-modal="true" aria-labelledby="edit-staff-title" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}><form onSubmit={submit} style={{ width: 'min(560px,calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}><h2 id="edit-staff-title">Edit staff member</h2><p style={{ color: '#64748B', fontSize: 12.5 }}>Employment status remains managed by the roster actions and Leave workflow.</p><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><input name="refId" required maxLength={30} defaultValue={member.refId} placeholder="Staff reference" style={field}/><input name="name" required minLength={2} maxLength={120} defaultValue={member.name} placeholder="Full name" style={field}/><input name="designation" required maxLength={80} defaultValue={member.designation} placeholder="Designation" style={field}/><input name="department" required maxLength={80} defaultValue={member.department} placeholder="Department" style={field}/><select name="type" defaultValue={member.type} style={field}><option>Teaching</option><option>Non-Teaching</option></select><input name="email" type="email" required defaultValue={member.email} placeholder="Email" style={field}/><input name="phone" required pattern="\+?[0-9 ]{7,20}" defaultValue={member.phone} placeholder="Phone" style={field}/><input name="joinedDate" type="date" required defaultValue={member.joinedDate.slice(0, 10)} style={field}/></div>{error && <p role="alert" style={{ color: '#B42318', fontSize: 12.5 }}>{error}</p>}<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose}>Cancel</button><button disabled={busy} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{busy ? 'Saving…' : 'Save changes'}</button></div></form></div>;
}
