import { FormEvent, useEffect, useState } from 'react';
import * as studentsApi from '../students/students.api';
import * as api from './cafeteria.api';

interface Props { mode: 'topup' | 'purchase'; wallet?: api.CafeteriaWallet; onClose: () => void; onSaved: () => void }

export function WalletActionModal({ mode, wallet, onClose, onSaved }: Props): JSX.Element {
  const [students, setStudents] = useState<studentsApi.Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(!wallet);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wallet) return;
    studentsApi.listStudents(1, '', { limit: 100, status: 'Active' }).then((result) => setStudents(result.items)).catch(() => setError('Could not load active students.')).finally(() => setLoadingStudents(false));
  }, [wallet]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const studentId = wallet && typeof wallet.student !== 'string' ? wallet.student._id : wallet && typeof wallet.student === 'string' ? wallet.student : String(data.get('studentId'));
    setBusy(true); setError(null);
    try {
      const input = { studentId, amount: Number(data.get('amount')), description: String(data.get('description')) };
      if (mode === 'topup') await api.topUpWallet(input); else await api.recordPurchase(input);
      onSaved(); onClose();
    } catch { setError(mode === 'purchase' ? 'Purchase could not be recorded. The wallet may have insufficient balance.' : 'Wallet top-up failed. Check the student, amount, and permissions.'); }
    finally { setBusy(false); }
  }

  const label = wallet ? (typeof wallet.student === 'string' ? wallet.student : `${wallet.student.name} (${wallet.student.refId})`) : null;
  const field = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' };
  return <div role="dialog" aria-modal="true" aria-labelledby="wallet-modal-title" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
    <form onSubmit={submit} style={{ width: 'min(500px,calc(100vw - 32px))', background: '#fff', borderRadius: 14, padding: 20 }}>
      <h2 id="wallet-modal-title">{mode === 'topup' ? 'Top up wallet' : 'Record purchase'}</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {label ? <div style={{ fontSize: 13, color: '#475569' }}>{label}{mode === 'purchase' ? ` · Available AED ${wallet?.balance.toLocaleString()}` : ''}</div> : <select name="studentId" required defaultValue="" style={field}><option value="">Select active student</option>{students.map((student) => <option key={student._id} value={student._id}>{student.name} · {student.refId} · {student.grade}</option>)}</select>}
        <input name="amount" type="number" required min="0.01" step="0.01" max={mode === 'purchase' ? wallet?.balance : undefined} placeholder="Amount (AED)" style={field} />
        <input name="description" required maxLength={200} defaultValue={mode === 'topup' ? 'Wallet top-up' : ''} placeholder={mode === 'topup' ? 'Top-up description' : 'Purchased items / meal'} style={field} />
      </div>
      {error && <p role="alert" style={{ color: '#B42318', fontSize: 12.5 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose}>Cancel</button><button disabled={busy || loadingStudents || (!wallet && students.length === 0)} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{busy ? 'Saving…' : loadingStudents ? 'Loading…' : mode === 'topup' ? 'Top up' : 'Record purchase'}</button></div>
    </form>
  </div>;
}
