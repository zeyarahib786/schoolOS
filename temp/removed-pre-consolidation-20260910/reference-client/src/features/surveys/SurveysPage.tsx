import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import * as surveysApi from './surveys.api';
import type { Survey } from './surveys.api';
import { SurveyModal } from './SurveyModal';
import { canWrite, useAuthStore } from '../../lib/store/authStore';

const statusTone: Record<Survey['status'], 'blue' | 'green' | 'gray'> = {
  Draft: 'gray',
  Scheduled: 'blue',
  Active: 'green',
  Closed: 'blue',
};

export function SurveysPage(): JSX.Element {
  const [items, setItems] = useState<Survey[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: 'create' | 'respond' | 'results'; survey?: Survey } | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);
  const role = useAuthStore((state) => state.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await surveysApi.listSurveys(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load surveys - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const activeCount = items.filter((s) => s.status === 'Active').length;
  const manage = canWrite(role);

  async function transition(survey: Survey) {
    setOperationId(survey._id);
    setError(null);
    try {
      if (survey.status === 'Draft' || survey.status === 'Scheduled') await surveysApi.activateSurvey(survey._id);
      else await surveysApi.closeSurvey(survey._id);
      await load(page);
    } catch { setError('Could not update survey status. Please check your permissions.'); }
    finally { setOperationId(null); }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {modal && <SurveyModal mode={modal.mode} survey={modal.survey} onClose={() => setModal(null)} onSaved={() => load(page)} />}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Surveys & Feedback</h1>
          <p style={{ fontSize: 12.5, color: '#64748B' }}>Anyone can respond once a survey is Active - one response per person.</p>
        </div>
        {manage && <button onClick={() => setModal({ mode: 'create' })} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap' }}>Create survey</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Surveys (this page)" value={total} accentColor="#0E7C39" />
        <Kpi label="Active now" value={activeCount} accentColor="#2563EB" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<Survey>
          keyField={(s) => s._id}
          rows={items}
          emptyLabel="No surveys found."
          columns={[
            { header: 'Title', render: (s) => s.title },
            { header: 'Questions', render: (s) => String(s.questions.length) },
            { header: 'Status', render: (s) => <Chip label={s.status} tone={statusTone[s.status]} /> },
            { header: 'Actions', render: (s) => <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {s.status === 'Active' && <button onClick={() => setModal({ mode: 'respond', survey: s })}>Respond</button>}
              <button onClick={() => setModal({ mode: 'results', survey: s })}>Results</button>
              {manage && s.status !== 'Closed' && <button disabled={operationId === s._id} onClick={() => transition(s)}>{operationId === s._id ? 'Saving…' : s.status === 'Draft' || s.status === 'Scheduled' ? 'Activate' : 'Close'}</button>}
            </div> },
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
