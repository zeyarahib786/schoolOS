import { FormEvent, useEffect, useState } from 'react';
import * as feesApi from './fees.api';
import * as studentsApi from '../students/students.api';
import type { Student } from '../students/students.api';

interface Props { onClose: () => void; onCreated: () => void }

export function CreateInvoiceModal({ onClose, onCreated }: Props): JSX.Element {
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    studentsApi.listStudents(1, '', { limit: 100, status: 'Active' })
      .then(({ items }) => setStudents(items))
      .catch(() => setError('Could not load active students.'))
      .finally(() => setLoadingStudents(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      await feesApi.createInvoice({
        refId: String(data.get('refId')),
        studentId: String(data.get('studentId')),
        term: String(data.get('term')),
        amount: Number(data.get('amount')),
        currency: String(data.get('currency')).toUpperCase(),
        dueDate: String(data.get('dueDate')),
      });
      onCreated();
      onClose();
    } catch {
      setError('Could not create invoice. Check the reference and invoice details.');
    } finally { setSubmitting(false); }
  }

  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return (
    <div role="dialog" aria-modal="true" aria-label="Create invoice" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
      <form onSubmit={submit} style={{ width: 'min(520px, calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 20px 50px #0F172A33' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 17 }}>Create invoice</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <input name="refId" required placeholder="Invoice reference" style={field} />
          <input name="term" required placeholder="Term" style={field} />
          <select name="studentId" required defaultValue="" disabled={loadingStudents} style={{ ...field, gridColumn: '1 / -1' }}>
            <option value="" disabled>{loadingStudents ? 'Loading students…' : 'Select student'}</option>
            {students.map((student) => <option key={student._id} value={student._id}>{student.name} ({student.refId})</option>)}
          </select>
          <input name="amount" type="number" required min="0.01" step="0.01" placeholder="Amount" style={field} />
          <input name="currency" required minLength={3} maxLength={3} defaultValue="AED" placeholder="Currency" style={field} />
          <input name="dueDate" type="date" required style={{ ...field, gridColumn: '1 / -1' }} />
        </div>
        {students.length === 100 && <p style={{ color: '#B45309', fontSize: 12 }}>Showing the first 100 active students.</p>}
        {error && <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" disabled={submitting || loadingStudents || students.length === 0} style={{ padding: '7px 12px', borderRadius: 8, border: 0, background: '#0E7C39', color: '#fff' }}>{submitting ? 'Saving…' : 'Create invoice'}</button>
        </div>
      </form>
    </div>
  );
}
