import { FormEvent, useEffect, useState } from 'react';
import * as staffApi from '../staff/staff.api';
import * as payrollApi from './payroll.api';

interface Props { onClose: () => void; onSaved: () => void }

export function GeneratePayslipModal({ onClose, onSaved }: Props): JSX.Element {
  const [staff, setStaff] = useState<staffApi.StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { staffApi.listStaff(1, '', { limit: 100, status: 'Active' }).then((result) => setStaff(result.items)).catch(() => setError('Could not load active staff.')).finally(() => setLoadingStaff(false)); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError(null);
    try { await payrollApi.generatePayslip({ staffId: String(data.get('staffId')), month: String(data.get('month')), basicSalary: Number(data.get('basicSalary')), allowances: Number(data.get('allowances')), deductions: Number(data.get('deductions')) }); onSaved(); onClose(); }
    catch { setError('Could not process payslip. Ensure deductions do not exceed salary plus allowances.'); }
    finally { setBusy(false); }
  }
  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return <div role="dialog" aria-modal="true" aria-labelledby="payslip-title" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}><form onSubmit={submit} style={{ width: 'min(520px,calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}><h2 id="payslip-title">Process payslip</h2><p style={{ color: '#64748B', fontSize: 12.5 }}>Processing the same staff member and month again recalculates the existing payslip.</p><div style={{ display: 'grid', gap: 10 }}><select name="staffId" required defaultValue="" style={field}><option value="">Select active staff member</option>{staff.map((member) => <option key={member._id} value={member._id}>{member.name} · {member.refId} · {member.designation}</option>)}</select><input name="month" type="month" required style={field}/><input name="basicSalary" type="number" required min="0.01" step="0.01" placeholder="Basic salary (AED)" style={field}/><input name="allowances" type="number" required min="0" step="0.01" defaultValue="0" placeholder="Allowances (AED)" style={field}/><input name="deductions" type="number" required min="0" step="0.01" defaultValue="0" placeholder="Deductions (AED)" style={field}/></div>{error && <p role="alert" style={{ color: '#B42318', fontSize: 12.5 }}>{error}</p>}<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose}>Cancel</button><button disabled={busy || loadingStaff || staff.length === 0} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{busy ? 'Processing…' : loadingStaff ? 'Loading…' : 'Process payslip'}</button></div></form></div>;
}
