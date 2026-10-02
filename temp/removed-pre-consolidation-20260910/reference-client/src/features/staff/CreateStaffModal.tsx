import { FormEvent, useState } from 'react';
import * as staffApi from './staff.api';

interface Props { onClose: () => void; onCreated: () => void }

export function CreateStaffModal({ onClose, onCreated }: Props): JSX.Element {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      await staffApi.createStaff({
        refId: String(data.get('refId')),
        name: String(data.get('name')),
        designation: String(data.get('designation')),
        department: String(data.get('department')),
        type: String(data.get('type')) as 'Teaching' | 'Non-Teaching',
        status: String(data.get('status')) as staffApi.StaffMember['status'],
        email: String(data.get('email')),
        phone: String(data.get('phone')),
        joinedDate: String(data.get('joinedDate')),
      });
      onCreated();
      onClose();
    } catch { setError('Could not create staff record. Reference or email may already exist.'); }
    finally { setSubmitting(false); }
  }
  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return (
    <div role="dialog" aria-modal="true" aria-label="Add staff member" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
      <form onSubmit={submit} style={{ width: 'min(560px, calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 20px 50px #0F172A33' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 17 }}>Add staff member</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <input name="refId" required placeholder="Staff reference" style={field} />
          <input name="name" required minLength={2} placeholder="Full name" style={field} />
          <input name="designation" required placeholder="Designation" style={field} />
          <input name="department" required placeholder="Department" style={field} />
          <select name="type" defaultValue="Teaching" style={field}><option>Teaching</option><option>Non-Teaching</option></select>
          <select name="status" defaultValue="Onboarding" style={field}><option>Onboarding</option><option>Active</option><option>Inactive</option></select>
          <input name="email" type="email" required placeholder="Email" style={field} />
          <input name="phone" required placeholder="Phone" style={field} />
          <input name="joinedDate" type="date" required style={{ ...field, gridColumn: '1 / -1' }} />
        </div>
        {error && <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" disabled={submitting} style={{ padding: '7px 12px', borderRadius: 8, border: 0, background: '#0E7C39', color: '#fff' }}>{submitting ? 'Saving…' : 'Add staff'}</button>
        </div>
      </form>
    </div>
  );
}
