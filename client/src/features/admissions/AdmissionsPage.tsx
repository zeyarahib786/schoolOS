import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import { useAuthStore } from '../../lib/store/authStore';
import * as admissionsApi from './admissions.api';
import type { AdmissionApplication } from './admissions.api';
import { AddAdmissionModal } from './AddAdmissionModal';

const statusTone: Record<AdmissionApplication['status'], 'gray' | 'blue' | 'amber' | 'green' | 'red'> = {
  Applied: 'gray',
  Shortlisted: 'blue',
  Interviewed: 'amber',
  Accepted: 'green',
  Enrolled: 'green',
  Rejected: 'red',
};

const nextStatus: Partial<Record<AdmissionApplication['status'], admissionsApi.AdmissionTransitionStatus>> = {
  Applied: 'Shortlisted',
  Shortlisted: 'Interviewed',
  Interviewed: 'Accepted',
};

export function AdmissionsPage(): JSX.Element {
  const [items, setItems] = useState<AdmissionApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const role = useAuthStore((s) => s.user?.role);
  const isStaff = role === 'Administrator' || role === 'Principal' || role === 'Teacher';

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await admissionsApi.listApplications(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load admissions - Administrator, Principal, or Teacher access is required');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStaff) load(page);
    else setLoading(false);
  }, [page, load, isStaff]);

  const acceptedCount = items.filter((a) => a.status === 'Accepted' || a.status === 'Enrolled').length;

  async function runAction(application: AdmissionApplication, action: 'advance' | 'reject' | 'enroll') {
    setUpdatingId(application._id);
    setError(null);
    try {
      if (action === 'enroll') {
        const refId = window.prompt('Student reference ID');
        if (!refId) return;
        const roll = window.prompt('Student roll number');
        if (!roll) return;
        await admissionsApi.enrollApplication(application._id, { refId, roll });
      } else {
        const status = action === 'reject' ? 'Rejected' : nextStatus[application.status];
        if (!status) return;
        await admissionsApi.transitionApplication(application._id, status);
      }
      await load(page);
    } catch {
      setError('Could not update this application. Its status may have changed; refresh and try again.');
    } finally {
      setUpdatingId(null);
    }
  }

  if (!isStaff) {
    return (
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Admissions</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          The admissions pipeline is internal staff work and isn't visible to your role.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showAddModal && <AddAdmissionModal onClose={() => setShowAddModal(false)} onCreated={() => load(page)} />}

      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Admissions</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          Applied → Shortlisted → Interviewed → Accepted → Enrolled; rejection possible at any pre-acceptance stage.
        </p>
        </div>
        <button onClick={() => setShowAddModal(true)} style={{ padding: '8px 12px', borderRadius: 8, border: 0, background: '#0E7C39', color: '#fff', whiteSpace: 'nowrap' }}>New application</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Applications (this page)" value={total} accentColor="#0E7C39" />
        <Kpi label="Accepted / Enrolled" value={acceptedCount} accentColor="#2563EB" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<AdmissionApplication>
          keyField={(a) => a._id}
          rows={items}
          emptyLabel="No applications in the pipeline."
          columns={[
            { header: 'Applicant', render: (a) => a.applicantName },
            { header: 'Grade', render: (a) => a.gradeAppliedFor },
            { header: 'Guardian', render: (a) => a.guardianName },
            { header: 'Status', render: (a) => <Chip label={a.status} tone={statusTone[a.status]} /> },
            { header: 'Applied', render: (a) => new Date(a.createdAt).toLocaleDateString() },
            {
              header: 'Actions',
              render: (a) => {
                const busy = updatingId === a._id;
                const advance = nextStatus[a.status];
                return (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {advance && <button disabled={busy} onClick={() => runAction(a, 'advance')}>{busy ? 'Saving…' : advance}</button>}
                    {a.status === 'Accepted' && <button disabled={busy} onClick={() => runAction(a, 'enroll')}>{busy ? 'Saving…' : 'Enroll'}</button>}
                    {(a.status === 'Applied' || a.status === 'Shortlisted' || a.status === 'Interviewed') && <button disabled={busy} onClick={() => runAction(a, 'reject')}>Reject</button>}
                  </div>
                );
              },
            },
          ]}
        />
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 14,
          fontSize: 12.5,
          color: '#64748B',
        }}
      >
        <span>
          Page {page} of {Math.max(totalPages, 1)} · {total} total
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: '#fff',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: '#fff',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
