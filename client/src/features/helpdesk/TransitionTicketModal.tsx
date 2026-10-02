import { FormEvent, useEffect, useState } from 'react';
import * as helpdeskApi from './helpdesk.api';
import * as staffApi from '../staff/staff.api';
import type { StaffMember } from '../staff/staff.api';

interface Props { ticket: helpdeskApi.Ticket; onClose: () => void; onUpdated: () => void }
const transitions: Record<helpdeskApi.Ticket['status'], helpdeskApi.Ticket['status'][]> = { Open: ['Assigned'], Assigned: ['Resolved', 'Open'], Resolved: ['Closed', 'Assigned'], Closed: [] };

export function TransitionTicketModal({ ticket, onClose, onUpdated }: Props): JSX.Element {
  const allowed = transitions[ticket.status];
  const [target, setTarget] = useState<helpdeskApi.Ticket['status']>(allowed[0]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { staffApi.listStaff(1, '').then(({ items }) => setStaff(items)).catch(() => setError('Could not load assignees.')); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const assignedTo = String(data.get('assignedTo') ?? '') || undefined;
    const resolutionNotes = String(data.get('resolutionNotes') ?? '') || undefined;
    if (target === 'Assigned' && !assignedTo && !ticket.assignedTo) { setError('Select an assignee.'); return; }
    setSubmitting(true); setError(null);
    try { await helpdeskApi.transitionTicket(ticket._id, { status: target, assignedTo, resolutionNotes }); onUpdated(); onClose(); }
    catch { setError('Could not update ticket. The transition may no longer be valid.'); }
    finally { setSubmitting(false); }
  }
  const field = { width: '100%', height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return <div role="dialog" aria-modal="true" aria-label="Update ticket" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}><form onSubmit={submit} style={{ width: 'min(440px, calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}>
    <h2 style={{ margin: '0 0 8px', fontSize: 17 }}>Update ticket</h2><p style={{ color: '#64748B', fontSize: 12.5 }}>{ticket.subject} · currently {ticket.status}</p>
    <select value={target} onChange={(event) => setTarget(event.target.value as helpdeskApi.Ticket['status'])} style={field}>{allowed.map((status) => <option key={status}>{status}</option>)}</select>
    {target === 'Assigned' && <select name="assignedTo" defaultValue={typeof ticket.assignedTo === 'string' ? ticket.assignedTo : ticket.assignedTo?._id ?? ''} style={{ ...field, marginTop: 10 }}><option value="">Select assignee</option>{staff.map((member) => <option key={member._id} value={member._id}>{member.name} ({member.refId})</option>)}</select>}
    {target === 'Resolved' && <textarea name="resolutionNotes" maxLength={2000} placeholder="Resolution notes (optional)" style={{ width: '100%', minHeight: 90, marginTop: 10, borderRadius: 8, border: '1px solid #E2E8F0', padding: 10 }} />}
    {error && <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginTop: 12 }}>{error}</div>}
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose} disabled={submitting}>Cancel</button><button type="submit" disabled={submitting} style={{ padding: '7px 12px', borderRadius: 8, border: 0, background: '#0E7C39', color: '#fff' }}>{submitting ? 'Saving…' : `Move to ${target}`}</button></div>
  </form></div>;
}
