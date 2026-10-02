import { FormEvent, useEffect, useState } from 'react';
import * as studentsApi from '../students/students.api';
import * as api from './hostel.api';

interface Props { mode: 'room' | 'allocate'; room?: api.HostelRoom; onClose: () => void; onSaved: () => void }

export function HostelActionModal({ mode, room, onClose, onSaved }: Props): JSX.Element {
  const [students, setStudents] = useState<studentsApi.Student[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(mode === 'allocate');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'allocate') return;
    studentsApi.listStudents(1, '', { limit: 100, status: 'Active' })
      .then((result) => setStudents(result.items))
      .catch(() => setError('Could not load active students.'))
      .finally(() => setLoadingOptions(false));
  }, [mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError(null);
    try {
      if (mode === 'room') await api.createRoom({ roomNumber: String(data.get('roomNumber')), block: String(data.get('block')), capacity: Number(data.get('capacity')) });
      else if (room) await api.allocateStudent(room._id, String(data.get('studentId')));
      onSaved(); onClose();
    } catch {
      setError(mode === 'room' ? 'Could not add room. This room number may already exist in the block.' : 'Could not allocate student. The room may be at full capacity.');
    } finally { setBusy(false); }
  }

  const occupantIds = new Set(room?.occupants.map((student) => typeof student === 'string' ? student : student._id) ?? []);
  const availableStudents = students.filter((student) => !occupantIds.has(student._id));
  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return <div role="dialog" aria-modal="true" aria-labelledby="hostel-modal-title" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
    <form onSubmit={submit} style={{ width: 'min(500px,calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}>
      <h2 id="hostel-modal-title">{mode === 'room' ? 'Add hostel room' : `Allocate student to ${room?.block}-${room?.roomNumber}`}</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {mode === 'room' ? <><input name="block" required maxLength={60} placeholder="Block" style={field} /><input name="roomNumber" required maxLength={30} placeholder="Room number" style={field} /><input name="capacity" type="number" required min="1" placeholder="Bed capacity" style={field} /></> : <select name="studentId" required defaultValue="" style={field}><option value="">Select active student</option>{availableStudents.map((student) => <option key={student._id} value={student._id}>{student.name} · {student.refId} · {student.grade}</option>)}</select>}
      </div>
      {error && <p role="alert" style={{ color: '#B42318', fontSize: 12.5 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose}>Cancel</button><button disabled={busy || loadingOptions || (mode === 'allocate' && availableStudents.length === 0)} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{busy ? 'Saving…' : loadingOptions ? 'Loading…' : mode === 'room' ? 'Add room' : 'Allocate'}</button></div>
    </form>
  </div>;
}
