import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import * as messagesApi from './messages.api';
import type { Message } from './messages.api';
import { ComposeMessageModal } from './ComposeMessageModal';
import { useAuthStore } from '../../lib/store/authStore';

function userLabel(user: Message['sender']): string {
  return typeof user === 'string' ? user : user.name;
}

export function MessagesPage(): JSX.Element {
  const [items, setItems] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const[showCompose,setShowCompose]=useState(false);const[readingId,setReadingId]=useState<string|null>(null);const userId=useAuthStore(s=>s.user?.id);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await messagesApi.listMessages(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load messages - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const unreadCount = items.filter((m) => !m.readAt).length;
  async function read(message:Message){setReadingId(message._id);setError(null);try{await messagesApi.markRead(message._id);await load(page);}catch{setError('Could not mark message as read.');}finally{setReadingId(null)}}

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showCompose&&<ComposeMessageModal onClose={()=>setShowCompose(false)} onSent={()=>load(page)}/>}
      <div style={{ marginBottom: 18,display:'flex',justifyContent:'space-between',alignItems:'start' }}><div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Messages</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          Private correspondence - only you and the other party can see a message; there is no administrative override.
        </p>
        </div><button onClick={()=>setShowCompose(true)} style={{background:'#0E7C39',color:'#fff',border:0,borderRadius:8,padding:'8px 12px'}}>Compose</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Your messages" value={total} accentColor="#0E7C39" />
        <Kpi label="Unread on this page" value={unreadCount} accentColor="#B45309" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<Message>
          keyField={(m) => m._id}
          rows={items}
          emptyLabel="No messages yet."
          columns={[
            { header: 'From', render: (m) => userLabel(m.sender) },
            { header: 'To', render: (m) => userLabel(m.recipient) },
            { header: 'Subject', render: (m) => m.subject },
            {
              header: 'Read',
              render: (m) => (m.readAt ? <Chip label="Read" tone="green" /> : <Chip label="Unread" tone="amber" />),
            },
            { header: 'Date', render: (m) => new Date(m.createdAt).toLocaleDateString() },
            {header:'Actions',render:(m)=>{const recipientId=typeof m.recipient==='string'?m.recipient:m.recipient._id;return !m.readAt&&recipientId===userId?<button disabled={readingId===m._id} onClick={()=>read(m)}>{readingId===m._id?'Saving…':'Mark read'}</button>:<span style={{color:'#64748B'}}>—</span>}},
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
