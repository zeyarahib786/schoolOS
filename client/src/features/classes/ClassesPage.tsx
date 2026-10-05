import { useEffect, useState, useCallback, FormEvent } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { DataTable } from '../../components/ui/DataTable';
import { useAuthStore, canWrite } from '../../lib/store/authStore';
import * as classesApi from './classes.api';
import type { ClassSection } from './classes.api';

export function ClassesPage(): JSX.Element {
  const [items, setItems] = useState<ClassSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const role = useAuthStore((s) => s.user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await classesApi.listClasses();
      setItems(data);
    } catch {
      setError('Could not load classes - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddClass(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      await classesApi.createClass({
        grade: String(data.get('grade')),
        section: String(data.get('section')),
        stream: String(data.get('stream')) as ClassSection['stream'],
        capacity: Number(data.get('capacity')),
      });
      setShowAddModal(false);
      await load();
    } catch {
      setError('Could not create class section. Check details and permissions.');
    } finally {
      setSubmitting(false);
    }
  }

  const totalCapacity = items.reduce((acc, c) => acc + c.capacity, 0);
  const totalFilled = items.reduce((acc, c) => acc + c.filled, 0);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Classes & Sections</h1>
          <p style={{ fontSize: 12.5, color: '#64748B' }}>Class structure, streams, and seat occupancy.</p>
        </div>
        {canWrite(role) && (
          <button
            onClick={() => setShowAddModal(true)}
            style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', fontWeight: 600, cursor: 'pointer' }}
          >
            Add Class Section
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Total classes" value={items.length} accentColor="#0E7C39" />
        <Kpi label="Total capacity" value={totalCapacity} accentColor="#2563EB" />
        <Kpi label="Enrolled students" value={totalFilled} accentColor="#0E7C39" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<ClassSection>
          keyField={(c) => c._id}
          rows={items}
          emptyLabel="No class sections configured."
          columns={[
            { header: 'Class / Section', render: (c) => `${c.grade} · ${c.section}` },
            { header: 'Name', render: (c) => c.className },
            { header: 'Stream', render: (c) => c.stream },
            { header: 'Class Teacher', render: (c) => c.teacherStaffId ? c.teacherStaffId.name : 'Unassigned' },
            { header: 'Occupancy', render: (c) => `${c.filled} / ${c.capacity}` },
          ]}
        />
      )}

      {showAddModal && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
          <form onSubmit={handleAddClass} style={{ width: 'min(440px, calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Add Class Section</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              <input name="grade" required placeholder="Grade (e.g. Grade 10)" style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' }} />
              <input name="section" required placeholder="Section (e.g. A)" style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' }} />
              <select name="stream" required defaultValue="General" style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' }}>
                <option value="Foundation">Foundation</option>
                <option value="Primary">Primary</option>
                <option value="General">General</option>
                <option value="Commerce">Commerce</option>
                <option value="Science">Science</option>
                <option value="Arts">Arts</option>
              </select>
              <input name="capacity" type="number" required min="1" defaultValue="35" placeholder="Capacity" style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button disabled={submitting} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px', fontWeight: 600, cursor: 'pointer' }}>
                {submitting ? 'Creating…' : 'Create Section'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

