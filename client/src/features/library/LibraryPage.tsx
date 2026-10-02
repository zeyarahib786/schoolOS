import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import * as libraryApi from './library.api';
import type { Book } from './library.api';
import type { Loan } from './library.api';
import { LibraryActionModal } from './LibraryActionModal';
import { useAuthStore } from '../../lib/store/authStore';

export function LibraryPage(): JSX.Element {
  const [items, setItems] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [mode, setMode] = useState<'book' | 'loan' | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  const role = useAuthStore((state) => state.user?.role);

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await libraryApi.listBooks(p, q);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      const loanResult = await libraryApi.listLoans(1);
      setLoans(loanResult.items);
    } catch {
      setError('Could not load the library catalogue - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, search);
  }, [page, search, load]);

  const totalCopies = items.reduce((s, b) => s + b.totalCopies, 0);
  const availableCopies = items.reduce((s, b) => s + b.availableCopies, 0);
  const canManage = role === 'Administrator' || role === 'Principal' || role === 'Teacher';
  async function returnBook(loan: Loan) { setReturningId(loan._id); setError(null); try { await libraryApi.returnLoan(loan._id); await load(page, search); } catch { setError('Could not return this loan. It may already be returned.'); } finally { setReturningId(null); } }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {mode && <LibraryActionModal mode={mode} books={items} onClose={() => setMode(null)} onSaved={() => load(page, search)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Library</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>Catalogue, availability, and loans.</p>
        </div>{canManage && <div style={{display:'flex',gap:8}}><button onClick={()=>setMode('book')}>Add / restock</button><button onClick={()=>setMode('loan')} style={{background:'#0E7C39',color:'#fff',border:0,borderRadius:8,padding:'8px 12px'}}>Issue book</button></div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Titles (this page)" value={total} accentColor="#0E7C39" />
        <Kpi label="Total copies" value={totalCopies} accentColor="#2563EB" />
        <Kpi label="Available now" value={availableCopies} accentColor="#B45309" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <input
          aria-label="Search by title or author"
          placeholder="Search by title or author"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 12px' }}
        />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <h2 style={{ fontSize: 16, marginTop: 24 }}>Recent loans</h2>
      <DataTable<Loan> keyField={(l) => l._id} rows={loans} emptyLabel="No loans visible to you." columns={[
        { header: 'Book', render: (l) => typeof l.book === 'string' ? l.book : l.book.title },
        { header: 'Student', render: (l) => typeof l.student === 'string' ? l.student : l.student.name },
        { header: 'Due', render: (l) => new Date(l.dueDate).toLocaleDateString() },
        { header: 'Status', render: (l) => <Chip label={l.status} tone={l.status === 'Returned' ? 'green' : l.status === 'Overdue' ? 'red' : 'amber'} /> },
        ...(canManage ? [{ header: 'Actions', render: (l: Loan) => l.status === 'Returned' ? <span style={{color:'#64748B'}}>Returned</span> : <button disabled={returningId===l._id} onClick={()=>returnBook(l)}>{returningId===l._id?'Saving…':'Return'}</button> }] : []),
      ]} />
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<Book>
          keyField={(b) => b._id}
          rows={items}
          emptyLabel="No books match your search."
          columns={[
            { header: 'Title', render: (b) => b.title },
            { header: 'Author', render: (b) => b.author },
            { header: 'Category', render: (b) => b.category },
            { header: 'Copies', render: (b) => `${b.totalCopies}`, align: 'right' },
            {
              header: 'Availability',
              render: (b) => (
                <Chip label={`${b.availableCopies} available`} tone={b.availableCopies > 0 ? 'green' : 'red'} />
              ),
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
