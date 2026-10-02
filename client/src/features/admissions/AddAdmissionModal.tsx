import { FormEvent, useState } from 'react';
import * as admissionsApi from './admissions.api';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function AddAdmissionModal({ onClose, onCreated }: Props): JSX.Element {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      await admissionsApi.createApplication({
        applicantName: String(data.get('applicantName') ?? ''),
        gradeAppliedFor: String(data.get('gradeAppliedFor') ?? ''),
        gender: String(data.get('gender')) as 'Male' | 'Female',
        guardianName: String(data.get('guardianName') ?? ''),
        phone: String(data.get('phone') ?? ''),
        notes: String(data.get('notes') ?? '') || undefined,
      });
      onCreated();
      onClose();
    } catch {
      setError('Could not create the application. Check the details and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };

  return (
    <div role="dialog" aria-modal="true" aria-label="New admission application" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
      <form onSubmit={submit} style={{ width: 'min(520px, calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 20px 50px #0F172A33' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 17 }}>New application</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <input name="applicantName" required minLength={2} placeholder="Applicant name" style={inputStyle} />
          <input name="gradeAppliedFor" required placeholder="Grade applied for" style={inputStyle} />
          <select name="gender" required defaultValue="" style={inputStyle}>
            <option value="" disabled>Gender</option><option value="Male">Male</option><option value="Female">Female</option>
          </select>
          <input name="guardianName" required minLength={2} placeholder="Guardian name" style={inputStyle} />
          <input name="phone" required placeholder="Phone" style={inputStyle} />
          <input name="notes" placeholder="Notes (optional)" style={inputStyle} />
        </div>
        {error && <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose} disabled={submitting} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff' }}>Cancel</button>
          <button type="submit" disabled={submitting} style={{ padding: '7px 12px', borderRadius: 8, border: 0, background: '#0E7C39', color: '#fff' }}>{submitting ? 'Saving…' : 'Create application'}</button>
        </div>
      </form>
    </div>
  );
}
