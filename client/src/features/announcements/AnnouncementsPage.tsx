import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import * as announcementsApi from './announcements.api';
import type { Announcement } from './announcements.api';
import { PublishAnnouncementModal } from './PublishAnnouncementModal';
import { useAuthStore } from '../../lib/store/authStore';

const audienceTone: Record<Announcement['audience'], 'green' | 'blue' | 'amber' | 'gray'> = {
  All: 'green',
  Staff: 'blue',
  Parents: 'amber',
  Students: 'gray',
};

export function AnnouncementsPage(): JSX.Element {
  const [items, setItems] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const[showPublish,setShowPublish]=useState(false);const role=useAuthStore(s=>s.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await announcementsApi.listAnnouncements(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load announcements - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const pinnedCount = items.filter((a) => a.pinned).length;
  const canPublish=role==='Administrator'||role==='Principal'||role==='Teacher';

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showPublish&&<PublishAnnouncementModal onClose={()=>setShowPublish(false)} onCreated={()=>load(page)}/>}
      <div style={{ marginBottom: 18,display:'flex',justifyContent:'space-between',alignItems:'start' }}><div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Announcements</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>You only see announcements addressed to your role.</p>
        </div>{canPublish&&<button onClick={()=>setShowPublish(true)} style={{background:'#0E7C39',color:'#fff',border:0,borderRadius:8,padding:'8px 12px'}}>Publish</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Visible to you" value={total} accentColor="#0E7C39" />
        <Kpi label="Pinned" value={pinnedCount} accentColor="#2563EB" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<Announcement>
          keyField={(a) => a._id}
          rows={items}
          emptyLabel="No announcements for you right now."
          columns={[
            { header: 'Title', render: (a) => (a.pinned ? `📌 ${a.title}` : a.title) },
            { header: 'Message', render: (a) => (a.body.length > 80 ? `${a.body.slice(0, 80)}…` : a.body) },
            { header: 'Audience', render: (a) => <Chip label={a.audience} tone={audienceTone[a.audience]} /> },
            { header: 'Date', render: (a) => new Date(a.createdAt).toLocaleDateString() },
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
