import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import { useAuthStore } from '../../lib/store/authStore';
import * as biometricApi from './biometric.api';
import type { BiometricDevice } from './biometric.api';
import { AddDeviceModal } from './AddDeviceModal';

const statusTone: Record<BiometricDevice['status'], 'green' | 'red'> = {
  Online: 'green',
  Offline: 'red',
};

export function BiometricPage(): JSX.Element {
  const [items, setItems] = useState<BiometricDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const role = useAuthStore((s) => s.user?.role);
  const isStaff = role === 'Administrator' || role === 'Principal' || role === 'Teacher';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await biometricApi.listDevices();
      setItems(result);
    } catch {
      setError('Could not load devices - Administrator, Principal, or Teacher access is required');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStaff) load();
    else setLoading(false);
  }, [load, isStaff]);

  const offlineCount = items.filter((d) => d.status === 'Offline').length;

  async function sync(device: BiometricDevice) {
    setSyncingId(device._id); setError(null);
    try { await biometricApi.syncDevice(device._id); await load(); }
    catch { setError('Could not sync device. Check the connection and try again.'); }
    finally { setSyncingId(null); }
  }

  if (!isStaff) {
    return (
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Biometric Devices</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>Device management isn't visible to your role.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showAdd && <AddDeviceModal onClose={() => setShowAdd(false)} onSaved={load} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Biometric Devices</h1><p style={{ fontSize: 12.5, color: '#64748B' }}>Attendance scanner status and sync.</p></div>
        <button onClick={() => setShowAdd(true)} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap' }}>Register device</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Total devices" value={items.length} accentColor="#0E7C39" />
        <Kpi label="Offline" value={offlineCount} accentColor="#B42318" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<BiometricDevice>
          keyField={(d) => d._id}
          rows={items}
          emptyLabel="No devices registered."
          columns={[
            { header: 'Device', render: (d) => d.name },
            { header: 'Location', render: (d) => d.location },
            { header: 'Status', render: (d) => <Chip label={d.status} tone={statusTone[d.status]} /> },
            { header: 'Last sync', render: (d) => (d.lastSyncAt ? new Date(d.lastSyncAt).toLocaleString() : 'Never') },
            { header: 'Actions', render: (d) => <button disabled={syncingId === d._id} onClick={() => sync(d)}>{syncingId === d._id ? 'Syncing…' : 'Sync now'}</button> },
          ]}
        />
      )}
    </div>
  );
}
