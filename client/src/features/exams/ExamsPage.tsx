import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import { useAuthStore } from '../../lib/store/authStore';
import * as examsApi from './exams.api';
import type { Exam, ExamResult } from './exams.api';
import { ExamActionModal } from './ExamActionModal';
import { ExamDetailsModal } from './ExamDetailsModal';

function studentLabel(student: ExamResult['student']): string {
  return typeof student === 'string' ? student : `${student.name} (${student.refId})`;
}

const gradeTone: Record<string, 'green' | 'blue' | 'amber' | 'red'> = {
  'A+': 'green',
  A: 'green',
  B: 'blue',
  C: 'amber',
  D: 'red',
};

export function ExamsPage(): JSX.Element {
  const [items, setItems] = useState<ExamResult[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action,setAction]=useState<'exam'|'result'|null>(null);
  const [selectedExam,setSelectedExam]=useState<Exam|null>(null);
  const role = useAuthStore((s) => s.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const [result, examItems] = await Promise.all([examsApi.listResults(p), examsApi.listExams()]);
      setItems(result.items);
      setExams(examItems);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError('Could not load exam results - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const classAverage = items.length
    ? Math.round((items.reduce((s, r) => s + r.averagePercent, 0) / items.length) * 10) / 10
    : 0;
  const passCount = items.filter((r) => r.passing).length;
  const passRate = items.length ? Math.round((passCount / items.length) * 100) : 0;

  const noEmptyDataHint = role === 'Accountant' || role === 'Parent' || role === 'Student';
  const canManage=role==='Administrator'||role==='Principal'||role==='Teacher';

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {action&&<ExamActionModal mode={action} onClose={()=>setAction(null)} onSaved={()=>load(page)}/>} 
      {selectedExam&&<ExamDetailsModal exam={selectedExam} canManage={canManage} onClose={()=>setSelectedExam(null)} onSaved={()=>load(page)}/>} 
      <div style={{ marginBottom: 18,display:'flex',justifyContent:'space-between',alignItems:'start' }}><div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Exams & Gradebook</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          Results with average and grade computed live from each recorded score - never stored as a stale value.
        </p>
        </div>{canManage&&<div style={{display:'flex',gap:8}}><button onClick={()=>setAction('exam')}>Create exam</button><button onClick={()=>setAction('result')} style={{background:'#0E7C39',color:'#fff',border:0,borderRadius:8,padding:'8px 12px'}}>Record result</button></div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Class average (this page)" value={`${classAverage}%`} accentColor="#0E7C39" />
        <Kpi label="Pass rate" value={`${passRate}%`} accentColor="#2563EB" />
        <Kpi label="Results (this page)" value={total} accentColor="#B45309" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<ExamResult>
          keyField={(r) => r._id}
          rows={items}
          emptyLabel={noEmptyDataHint ? 'No exam results are linked to your account yet.' : 'No exam results found.'}
          columns={[
            { header: 'Student', render: (r) => studentLabel(r.student) },
            { header: 'Subjects', render: (r) => r.scores.map((s) => `${s.subject}: ${s.marks}`).join(', ') },
            { header: 'Average', render: (r) => `${r.averagePercent}%`, align: 'right' },
            { header: 'Grade', render: (r) => <Chip label={r.grade} tone={gradeTone[r.grade] ?? 'blue'} /> },
            {
              header: 'Status',
              render: (r) => <Chip label={r.passing ? 'Pass' : 'Fail'} tone={r.passing ? 'green' : 'red'} />,
            },
          ]}
        />
      )}

      {!loading && <><h2 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 8px' }}>Exam schemes</h2><DataTable<Exam> keyField={(exam) => exam._id} rows={exams} emptyLabel="No exam schemes found." columns={[{ header: 'Exam', render: (exam) => exam.name },{ header: 'Term', render: (exam) => exam.term },{ header: 'Subjects', render: (exam) => exam.subjects.join(', ') },{ header: 'Marks', render: (exam) => `${exam.passMark} pass / ${exam.maxMarks} max` },{ header: 'Actions', render: (exam) => <button onClick={() => setSelectedExam(exam)}>Summary & subjects</button> }]}/></>}

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
