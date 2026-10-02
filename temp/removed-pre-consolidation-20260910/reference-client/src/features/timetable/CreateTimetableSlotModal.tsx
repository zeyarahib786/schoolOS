import { FormEvent, useState } from 'react';
import * as api from './timetable.api';

interface Props { onClose: () => void; onSaved: () => void }

export function CreateTimetableSlotModal({ onClose, onSaved }: Props): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError(null);
    try { await api.createSlot({ grade: String(data.get('grade')), dayOfWeek: String(data.get('dayOfWeek')) as api.TimetableSlot['dayOfWeek'], periodNumber: Number(data.get('periodNumber')), subject: String(data.get('subject')), teacherName: String(data.get('teacherName')) }); onSaved(); onClose(); }
    catch { setError('Could not schedule period. This grade may already have a subject in the selected day and period.'); }
    finally { setBusy(false); }
  }
  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return <div role="dialog" aria-modal="true" aria-labelledby="schedule-period-title" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}><form onSubmit={submit} style={{ width: 'min(500px,calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}><h2 id="schedule-period-title">Schedule period</h2><div style={{ display: 'grid', gap: 10 }}><input name="grade" required maxLength={60} placeholder="Grade / class" style={field}/><select name="dayOfWeek" required defaultValue="Monday" style={field}><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option></select><select name="periodNumber" required defaultValue="1" style={field}>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>Period {index + 1}</option>)}</select><input name="subject" required maxLength={80} placeholder="Subject" style={field}/><input name="teacherName" required minLength={2} maxLength={120} placeholder="Teacher name" style={field}/></div>{error && <p role="alert" style={{ color: '#B42318', fontSize: 12.5 }}>{error}</p>}<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose}>Cancel</button><button disabled={busy} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{busy ? 'Scheduling…' : 'Schedule period'}</button></div></form></div>;
}
