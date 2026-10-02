import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../lib/store/authStore';
import * as settingsApi from './settings.api';
import type { SchoolSettings } from './settings.api';
import { EditSettingsModal } from './EditSettingsModal';

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid #F1F5F9',
        fontSize: 13,
      }}
    >
      <span style={{ color: '#64748B' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export function SettingsPage(): JSX.Element {
  const [data, setData] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const role = useAuthStore((s) => s.user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await settingsApi.getSettings());
    } catch {
      setError('Could not load settings - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ padding: 24, maxWidth: 640, margin: '0 auto' }}>
      {editing && data && <EditSettingsModal settings={data} onClose={() => setEditing(false)} onSaved={load} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Settings</h1><p style={{ fontSize: 12.5, color: '#64748B' }}>School-wide configuration.{role === 'Administrator' ? ' Changes are audited.' : ' Only an Administrator can change these.'}</p></div>
        {role === 'Administrator' && data && <button onClick={() => setEditing(true)} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap' }}>Edit settings</button>}
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        data && (
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '6px 18px' }}>
            <Row label="School name" value={data.schoolName} />
            <Row label="Academic year" value={data.academicYear} />
            <Row label="Timezone" value={data.timezone} />
            <Row label="Currency" value={data.currency} />
            <Row label="Default annual leave (days)" value={String(data.defaultAnnualLeave)} />
          </div>
        )
      )}
    </div>
  );
}
