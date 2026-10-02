import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import { useAuthStore } from '../../lib/store/authStore';
import * as lmsApi from './lms.api';
import type { Assignment, Submission } from './lms.api';
import { LmsActionModal } from './LmsActionModal';
import { canWrite } from '../../lib/store/authStore';

const statusTone: Record<Submission['status'], 'blue' | 'green'> = {
  Submitted: 'blue',
  Graded: 'green',
};

function studentLabel(student: Submission['student']): string {
  return typeof student === 'string' ? student : `${student.name} (${student.refId})`;
}

function assignmentLabel(assignment: Submission['assignment']): string {
  return typeof assignment === 'string' ? assignment : assignment.title;
}

export function LmsPage(): JSX.Element {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: 'create' | 'submit' | 'grade'; assignment?: Assignment; submission?: Submission } | null>(null);
  const role = useAuthStore((s) => s.user?.role);
  const isStudent = role === 'Student';
  const canManage = canWrite(role);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignmentResult, submissionResult] = await Promise.all([
        lmsApi.listAssignments(1),
        lmsApi.listSubmissions(),
      ]);
      setAssignments(assignmentResult.items);
      setSubmissions(submissionResult);
    } catch {
      setError('Could not load LMS data - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const lateCount = submissions.filter((s) => s.isLate).length;
  const gradedCount = submissions.filter((s) => s.status === 'Graded').length;
  const submittedAssignmentIds = new Set(submissions.map((submission) => typeof submission.assignment === 'string' ? submission.assignment : submission.assignment._id));

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {modal && <LmsActionModal {...modal} onClose={() => setModal(null)} onSaved={load} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Learning Management</h1><p style={{ fontSize: 12.5, color: '#64748B' }}>{isStudent ? 'Your assignments and submissions.' : 'Assignments and student submissions.'}</p></div>
        {canManage && <button onClick={() => setModal({ mode: 'create' })} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap' }}>Create assignment</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Assignments" value={assignments.length} accentColor="#0E7C39" />
        <Kpi label="Graded" value={gradedCount} accentColor="#2563EB" />
        <Kpi label="Late" value={lateCount} accentColor="#B45309" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Assignments</h2>
          <DataTable<Assignment>
            keyField={(a) => a._id}
            rows={assignments}
            emptyLabel="No assignments found."
            columns={[
              { header: 'Title', render: (a) => a.title },
              { header: 'Subject', render: (a) => a.subject },
              { header: 'Due', render: (a) => new Date(a.dueDate).toLocaleDateString() },
              { header: 'Max score', render: (a) => String(a.maxScore), align: 'right' },
              ...(isStudent ? [{ header: 'Actions', render: (a: Assignment) => <button disabled={submittedAssignmentIds.has(a._id)} onClick={() => setModal({ mode: 'submit', assignment: a })}>{submittedAssignmentIds.has(a._id) ? 'Submitted' : 'Submit'}</button> }] : []),
            ]}
          />

          <h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 8px' }}>Submissions</h2>
          <DataTable<Submission>
            keyField={(s) => s._id}
            rows={submissions}
            emptyLabel="No submissions found."
            columns={[
              { header: 'Assignment', render: (s) => assignmentLabel(s.assignment) },
              { header: 'Student', render: (s) => studentLabel(s.student) },
              { header: 'Status', render: (s) => <Chip label={s.status} tone={statusTone[s.status]} /> },
              { header: 'Score', render: (s) => (s.score !== undefined ? String(s.score) : '—'), align: 'right' },
              { header: 'Late', render: (s) => (s.isLate ? <Chip label="Late" tone="red" /> : '—') },
              ...(canManage ? [{ header: 'Actions', render: (s: Submission) => <button onClick={() => setModal({ mode: 'grade', submission: s })}>{s.status === 'Graded' ? 'Update grade' : 'Grade'}</button> }] : []),
            ]}
          />
        </>
      )}
    </div>
  );
}
