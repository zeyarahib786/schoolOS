import { FormEvent, useEffect, useMemo, useState } from 'react';
import * as attendanceApi from './attendance.api';
import * as studentsApi from '../students/students.api';
import type { Student } from '../students/students.api';

interface Props { onClose: () => void; onMarked: () => void }
type Status = attendanceApi.AttendanceRecord['status'];

export function MarkAttendanceModal({ onClose, onMarked }: Props): JSX.Element {
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [grade, setGrade] = useState('All');
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    studentsApi.listStudents(1, '', { limit: 100, status: 'Active' })
      .then(({ items }) => {
        setStudents(items);
        setSelected(Object.fromEntries(items.map((student) => [student._id, true])));
        setStatuses(Object.fromEntries(items.map((student) => [student._id, 'Present'])));
      })
      .catch(() => setError('Could not load active students.'))
      .finally(() => setLoadingStudents(false));
  }, []);

  const grades = useMemo(() => [...new Set(students.map((student) => student.grade))].sort(), [students]);
  const visible = grade === 'All' ? students : students.filter((student) => student.grade === grade);
  const chosen = visible.filter((student) => selected[student._id]);

  function selectVisible(value: boolean) {
    setSelected((current) => ({
      ...current,
      ...Object.fromEntries(visible.map((student) => [student._id, value])),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (chosen.length === 0) { setError('Select at least one student.'); return; }
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      await attendanceApi.saveRegister({
        date: String(data.get('date')),
        session: String(data.get('session')) as 'AM' | 'PM',
        entries: chosen.map((student) => ({ studentId: student._id, status: statuses[student._id] ?? 'Present' })),
      });
      onMarked();
      onClose();
    } catch {
      setError('Batch was not saved. Please check the selected students and try again.');
    } finally { setSubmitting(false); }
  }

  const field = { height: 36, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 9px' };
  return (
    <div role="dialog" aria-modal="true" aria-label="Mark attendance" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
      <form onSubmit={submit} style={{ width: 'min(680px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 40px)', overflow: 'auto', background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 20px 50px #0F172A33' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 17 }}>Mark class attendance</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} style={field} />
          <select name="session" defaultValue="AM" style={field}><option value="AM">AM session</option><option value="PM">PM session</option></select>
          <select value={grade} onChange={(event) => setGrade(event.target.value)} style={field}><option>All</option>{grades.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12.5 }}>
          <span>{chosen.length} of {visible.length} selected</span>
          <span><button type="button" onClick={() => selectVisible(true)}>Select all</button> <button type="button" onClick={() => selectVisible(false)}>Clear</button></span>
        </div>
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
          {loadingStudents ? <div style={{ padding: 24, textAlign: 'center' }}>Loading students…</div> : visible.map((student) => (
            <div key={student._id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 140px', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>
              <input aria-label={`Select ${student.name}`} type="checkbox" checked={Boolean(selected[student._id])} onChange={(event) => setSelected((current) => ({ ...current, [student._id]: event.target.checked }))} />
              <span style={{ fontSize: 12.5 }}>{student.name} <span style={{ color: '#64748B' }}>({student.refId})</span></span>
              <select aria-label={`Status for ${student.name}`} disabled={!selected[student._id]} value={statuses[student._id] ?? 'Present'} onChange={(event) => setStatuses((current) => ({ ...current, [student._id]: event.target.value as Status }))} style={field}>
                <option>Present</option><option>Absent</option><option>Late</option><option>Excused</option>
              </select>
            </div>
          ))}
        </div>
        {students.length === 100 && <p style={{ color: '#B45309', fontSize: 12 }}>Showing the first 100 active students. Use a grade-specific batch for larger schools.</p>}
        {error && <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" disabled={submitting || loadingStudents || chosen.length === 0} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{submitting ? 'Saving batch…' : `Mark ${chosen.length} students`}</button>
        </div>
      </form>
    </div>
  );
}
