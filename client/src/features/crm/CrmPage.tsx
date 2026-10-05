import { useEffect, useState, useCallback, FormEvent } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import { useAuthStore, canWrite } from '../../lib/store/authStore';
import * as crmApi from './crm.api';
import type { CrmLead } from './crm.api';

const tempTone: Record<CrmLead['temperature'], 'red' | 'amber' | 'blue'> = {
  Hot: 'red',
  Warm: 'amber',
  Cold: 'blue',
};

export function CrmPage(): JSX.Element {
  const [items, setItems] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const role = useAuthStore((s) => s.user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crmApi.listCrmLeads();
      setItems(data);
    } catch {
      setError('Could not load CRM leads - Administrator or Principal access is required');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddLead(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      await crmApi.createCrmLead({
        name: String(data.get('name')),
        grade: String(data.get('grade')),
        guardian: String(data.get('guardian') || undefined),
        phone: String(data.get('phone') || undefined),
        source: String(data.get('source') || 'Website'),
        temperature: String(data.get('temperature') || 'Warm') as CrmLead['temperature'],
      });
      setShowAddModal(false);
      await load();
    } catch {
      setError('Could not create lead.');
    } finally {
      setSubmitting(false);
    }
  }

  const hotCount = items.filter((l) => l.temperature === 'Hot').length;
  const wonCount = items.filter((l) => l.stage === 'Won').length;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Enrolment CRM</h1>
          <p style={{ fontSize: 12.5, color: '#64748B' }}>Prospective student leads and pipeline tracking.</p>
        </div>
        {canWrite(role) && (
          <button
            onClick={() => setShowAddModal(true)}
            style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', fontWeight: 600, cursor: 'pointer' }}
          >
            Add Lead
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Total leads" value={items.length} accentColor="#0E7C39" />
        <Kpi label="Hot prospects" value={hotCount} accentColor="#E11D2A" />
        <Kpi label="Enrolled (Won)" value={wonCount} accentColor="#2563EB" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<CrmLead>
          keyField={(l) => l._id}
          rows={items}
          emptyLabel="No CRM leads logged."
          columns={[
            { header: 'Applicant', render: (l) => `${l.name} (${l.grade})` },
            { header: 'Guardian / Phone', render: (l) => `${l.guardian || '—'} ${l.phone ? '· ' + l.phone : ''}` },
            { header: 'Stage', render: (l) => l.stage },
            { header: 'Temperature', render: (l) => <Chip label={l.temperature} tone={tempTone[l.temperature]} /> },
            { header: 'Source', render: (l) => l.source },
          ]}
        />
      )}

      {showAddModal && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
          <form onSubmit={handleAddLead} style={{ width: 'min(440px, calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Add Lead</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              <input name="name" required placeholder="Student Name" style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' }} />
              <input name="grade" required placeholder="Grade Applying For" style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' }} />
              <input name="guardian" placeholder="Guardian Name" style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' }} />
              <input name="phone" placeholder="Contact Phone" style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' }} />
              <select name="temperature" defaultValue="Warm" style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' }}>
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button disabled={submitting} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px', fontWeight: 600, cursor: 'pointer' }}>
                {submitting ? 'Saving…' : 'Add Lead'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

