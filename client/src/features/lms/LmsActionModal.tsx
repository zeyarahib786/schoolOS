import { FormEvent, useState } from 'react';
import * as api from './lms.api';

interface Props { mode: 'create' | 'submit' | 'grade'; assignment?: api.Assignment; submission?: api.Submission; onClose: () => void; onSaved: () => void }

export function LmsActionModal({ mode, assignment, submission, onClose, onSaved }: Props): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError(null);
    try {
      if (mode === 'create') await api.createAssignment({ title: String(data.get('title')), description: String(data.get('description')), subject: String(data.get('subject')), grade: String(data.get('grade')), dueDate: String(data.get('dueDate')), maxScore: Number(data.get('maxScore')) });
      if (mode === 'submit' && assignment) await api.submitAssignment(assignment._id, String(data.get('content')));
      if (mode === 'grade' && submission) { const feedback = String(data.get('feedback') ?? '').trim() || undefined; await api.gradeSubmission(submission._id, Number(data.get('score')), feedback); }
      onSaved(); onClose();
    } catch { setError(mode === 'create' ? 'Could not create assignment. Check all details and permissions.' : mode === 'submit' ? 'Could not submit assignment. You may already have submitted it, or your account is not linked to a student.' : 'Could not save grade. Score cannot exceed the assignment maximum.'); }
    finally { setBusy(false); }
  }
  const linkedAssignment = submission && typeof submission.assignment !== 'string' ? submission.assignment : undefined;
  const title = mode === 'create' ? 'Create assignment' : mode === 'submit' ? `Submit: ${assignment?.title}` : `Grade: ${linkedAssignment?.title ?? 'submission'}`;
  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return <div role="dialog" aria-modal="true" aria-labelledby="lms-modal-title" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}><form onSubmit={submit} style={{ width: 'min(540px,calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', overflow: 'auto', background: '#fff', borderRadius: 14, padding: 20 }}><h2 id="lms-modal-title">{title}</h2><div style={{ display: 'grid', gap: 10 }}>
    {mode === 'create' && <><input name="title" required minLength={2} maxLength={160} placeholder="Assignment title" style={field}/><textarea name="description" required maxLength={2000} placeholder="Instructions" style={{ ...field, height: 100, padding: 10 }}/><input name="subject" required maxLength={80} placeholder="Subject" style={field}/><input name="grade" required maxLength={60} placeholder="Grade / class" style={field}/><input name="dueDate" type="datetime-local" required style={field}/><input name="maxScore" type="number" required min="1" step="0.01" placeholder="Maximum score" style={field}/></>}
    {mode === 'submit' && assignment && <><p style={{ color: '#64748B', fontSize: 12.5 }}>{assignment.description}</p><textarea name="content" required maxLength={5000} placeholder="Your submission" style={{ ...field, height: 180, padding: 10 }}/></>}
    {mode === 'grade' && submission && <><div style={{ fontSize: 12.5, color: '#475569' }}>Student: {typeof submission.student === 'string' ? submission.student : submission.student.name}<br/>Submission: {submission.content}</div><input name="score" type="number" required min="0" max={linkedAssignment?.maxScore} step="0.01" defaultValue={submission.score} placeholder={`Score${linkedAssignment ? ` (max ${linkedAssignment.maxScore})` : ''}`} style={field}/><textarea name="feedback" maxLength={2000} defaultValue={submission.feedback} placeholder="Feedback (optional)" style={{ ...field, height: 100, padding: 10 }}/></>}
  </div>{error && <p role="alert" style={{ color: '#B42318', fontSize: 12.5 }}>{error}</p>}<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose}>Cancel</button><button disabled={busy} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{busy ? 'Saving…' : mode === 'create' ? 'Create assignment' : mode === 'submit' ? 'Submit' : 'Save grade'}</button></div></form></div>;
}
