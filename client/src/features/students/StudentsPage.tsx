import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import { useAuthStore, canWrite } from '../../lib/store/authStore';
import * as studentsApi from './students.api';
import type { Student } from './students.api';
import { AddStudentModal } from './AddStudentModal';
import { EditStudentModal } from './EditStudentModal';

export function StudentsPage(): JSX.Element {
  const [items, setItems] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const role = useAuthStore((s) => s.user?.role);

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await studentsApi.listStudents(p, q);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load students - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, search);
  }, [page, search, load]);

  const activeCount = items.filter((s) => s.status === 'Active').length;
  const overdueCount = items.filter((s) => s.feeStatus === 'Overdue').length;
  const canDelete = role === 'Administrator' || role === 'Principal';

  async function remove(student: Student) {
    if (!window.confirm(`Permanently delete ${student.name}? This cannot be undone.`)) return;
    setDeletingId(student._id); setError(null);
    try { await studentsApi.deleteStudent(student._id); await load(page, search); }
    catch { setError('Could not delete student. Please check your permissions and try again.'); }
    finally { setDeletingId(null); }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Students</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>Roster, fee status, and attendance overview.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Total students (this page)" value={total} accentColor="#0E7C39" />
        <Kpi label="Active" value={activeCount} accentColor="#2563EB" />
        <Kpi label="Fees overdue" value={overdueCount} accentColor="#E11D2A" />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input
          aria-label="Search students"
          placeholder="Search by name or reference"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          style={{ flex: 1, height: 38, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 12px' }}
        />
        {canWrite(role) && (
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              height: 38,
              padding: '0 16px',
              borderRadius: 10,
              background: '#0E7C39',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + Add student
          </button>
        )}
      </div>

      {showAddModal && <AddStudentModal onClose={() => setShowAddModal(false)} onCreated={() => load(page, search)} />}
      {editing && <EditStudentModal student={editing} onClose={() => setEditing(null)} onSaved={() => load(page, search)} />}

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<Student>
          keyField={(s) => s._id}
          rows={items}
          emptyLabel="No students match your search"
          columns={[
            { header: 'Name', render: (s) => s.name },
            { header: 'Reference', render: (s) => s.refId },
            { header: 'Grade', render: (s) => s.grade },
            {
              header: 'Fee status',
              render: (s) => (
                <Chip
                  label={s.feeStatus}
                  tone={s.feeStatus === 'Paid' ? 'green' : s.feeStatus === 'Overdue' ? 'red' : 'amber'}
                />
              ),
            },
            { header: 'Attendance', render: (s) => `${s.attendancePct}%`, align: 'right' },
            ...(canWrite(role) ? [{ header: 'Actions', render: (s: Student) => <div style={{ display: 'flex', gap: 6 }}><button onClick={() => setEditing(s)}>Edit</button>{canDelete && <button disabled={deletingId === s._id} onClick={() => remove(s)}>{deletingId === s._id ? 'Deleting…' : 'Delete'}</button>}</div> }] : []),
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
