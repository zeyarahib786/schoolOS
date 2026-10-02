import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import * as auditApi from './audit.api';
import type { AuditEntry } from './audit.api';
import { useAuthStore } from '../../lib/store/authStore';

const severityTone: Record<AuditEntry['severity'], 'blue' | 'amber' | 'red'> = {
  Info: 'blue',
  Warning: 'amber',
  Critical: 'red',
};

function performerLabel(performedBy: AuditEntry['performedBy']): string {
  return typeof performedBy === 'string' ? performedBy : performedBy.name;
}

export function AuditLogPage(): JSX.Element {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [moduleFilter, setModuleFilter] = useState('');
  const [severity, setSeverity] = useState<AuditEntry['severity'] | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const role = useAuthStore((state) => state.user?.role);
  const canView = role === 'Administrator' || role === 'Principal';

  const load = useCallback(async (currentPage: number, module: string, level: AuditEntry['severity'] | '') => {
    setLoading(true);
    setError(null);
    try {
      const result = await auditApi.listAuditLog(currentPage, { module, severity: level || undefined });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load the audit log - Administrator or Principal access is required');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) load(page, moduleFilter, severity);
    else setLoading(false);
  }, [page, moduleFilter, severity, load, canView]);

  const warningCount = items.filter((e) => e.severity === 'Warning').length;
  const criticalCount = items.filter((e) => e.severity === 'Critical').length;

  if (!canView) return <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}><h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Audit Log</h1><p style={{ fontSize: 12.5, color: '#64748B' }}>The audit log is restricted to Administrator and Principal roles.</p></div>;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Audit Log</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          A read-only, append-only record - entries here can never be edited or deleted through any part of this system.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Warnings (this page)" value={warningCount} accentColor="#B45309" />
        <Kpi label="Critical (this page)" value={criticalCount} accentColor="#B42318" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px auto', gap: 10, marginBottom: 14 }}><input aria-label="Filter by module" value={moduleFilter} onChange={(event) => { setPage(1); setModuleFilter(event.target.value); }} placeholder="Exact module, e.g. Settings" maxLength={80} style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' }}/><select aria-label="Filter by severity" value={severity} onChange={(event) => { setPage(1); setSeverity(event.target.value as AuditEntry['severity'] | ''); }} style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' }}><option value="">All severities</option><option>Info</option><option>Warning</option><option>Critical</option></select><button onClick={() => { setPage(1); setModuleFilter(''); setSeverity(''); }}>Clear filters</button></div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<AuditEntry>
          keyField={(e) => e._id}
          rows={items}
          emptyLabel="No audit log entries yet."
          columns={[
            { header: 'Action', render: (e) => e.action },
            { header: 'Module', render: (e) => e.module },
            { header: 'By', render: (e) => performerLabel(e.performedBy) },
            { header: 'Severity', render: (e) => <Chip label={e.severity} tone={severityTone[e.severity]} /> },
            { header: 'When', render: (e) => new Date(e.createdAt).toLocaleString() },
          ]}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: 12.5, color: '#64748B' }}><span>Page {page} of {Math.max(totalPages, 1)} · {total} total</span><div style={{ display: 'flex', gap: 8 }}><button disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
    </div>
  );
}
