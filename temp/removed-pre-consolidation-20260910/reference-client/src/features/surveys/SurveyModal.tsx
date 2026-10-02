import { FormEvent, useEffect, useState } from 'react';
import * as api from './surveys.api';

interface Props { mode: 'create' | 'respond' | 'results'; survey?: api.Survey; onClose: () => void; onSaved: () => void }
type DraftQuestion = { questionText: string; options: string };

export function SurveyModal({ mode, survey, onClose, onSaved }: Props): JSX.Element {
  const [questions, setQuestions] = useState<DraftQuestion[]>([{ questionText: '', options: '' }]);
  const [results, setResults] = useState<api.SurveyResults | null>(null);
  const [busy, setBusy] = useState(mode === 'results');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'results' || !survey) return;
    api.getSurveyResults(survey._id).then(setResults).catch(() => setError('Could not load survey results.')).finally(() => setBusy(false));
  }, [mode, survey]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      if (mode === 'create') {
        await api.createSurvey({
          title: String(data.get('title')),
          description: String(data.get('description')),
          questions: questions.map((question) => ({ questionText: question.questionText.trim(), options: question.options.split(',').map((option) => option.trim()).filter(Boolean) })),
        });
      } else if (mode === 'respond' && survey) {
        await api.respondToSurvey(survey._id, survey.questions.map((_, questionIndex) => ({ questionIndex, selectedOption: String(data.get(`answer-${questionIndex}`)) })));
      }
      onSaved();
      onClose();
    } catch {
      setError(mode === 'respond' ? 'Could not submit response. You may already have responded.' : 'Could not create survey. Every question needs at least two comma-separated options.');
    } finally { setBusy(false); }
  }

  const field = { minHeight: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '8px 10px' };
  const title = mode === 'create' ? 'Create survey' : mode === 'respond' ? survey?.title : `${survey?.title ?? 'Survey'} results`;
  return <div role="dialog" aria-modal="true" aria-labelledby="survey-modal-title" style={{ position: 'fixed', inset: 0, background: '#0F172A66', display: 'grid', placeItems: 'center', zIndex: 50 }}>
    <form onSubmit={submit} style={{ width: 'min(620px,calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', overflow: 'auto', background: '#fff', borderRadius: 14, padding: 20 }}>
      <h2 id="survey-modal-title">{title}</h2>
      {mode === 'create' && <div style={{ display: 'grid', gap: 12 }}>
        <input name="title" required minLength={2} maxLength={160} placeholder="Survey title" style={field} />
        <textarea name="description" required maxLength={1000} placeholder="Description" style={{ ...field, minHeight: 80 }} />
        {questions.map((question, index) => <fieldset key={index} style={{ border: '1px solid #E2E8F0', borderRadius: 8, display: 'grid', gap: 8 }}>
          <legend>Question {index + 1}</legend>
          <input required maxLength={300} value={question.questionText} onChange={(e) => setQuestions((current) => current.map((item, i) => i === index ? { ...item, questionText: e.target.value } : item))} placeholder="Question" style={field} />
          <input required value={question.options} onChange={(e) => setQuestions((current) => current.map((item, i) => i === index ? { ...item, options: e.target.value } : item))} placeholder="Options separated by commas" style={field} />
          {questions.length > 1 && <button type="button" onClick={() => setQuestions((current) => current.filter((_, i) => i !== index))}>Remove question</button>}
        </fieldset>)}
        <button type="button" onClick={() => setQuestions((current) => [...current, { questionText: '', options: '' }])}>Add question</button>
      </div>}
      {mode === 'respond' && survey && <div style={{ display: 'grid', gap: 14 }}><p style={{ color: '#64748B' }}>{survey.description}</p>{survey.questions.map((question, index) => <fieldset key={index} style={{ border: '1px solid #E2E8F0', borderRadius: 8 }}><legend>{question.questionText}</legend>{question.options.map((option) => <label key={option} style={{ display: 'block', padding: 5 }}><input required type="radio" name={`answer-${index}`} value={option} /> {option}</label>)}</fieldset>)}</div>}
      {mode === 'results' && <div>{busy ? 'Loading…' : results && <><p>{results.totalRespondents} respondent{results.totalRespondents === 1 ? '' : 's'}</p>{results.questions.map((question, index) => <div key={index} style={{ marginBottom: 16 }}><strong>{question.questionText}</strong>{question.options.map((option) => <div key={option.option} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', padding: '6px 0' }}><span>{option.option}</span><span>{option.count}</span></div>)}</div>)}</>}</div>}
      {error && <p role="alert" style={{ color: '#B42318', fontSize: 12.5 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}><button type="button" onClick={onClose}>{mode === 'results' ? 'Close' : 'Cancel'}</button>{mode !== 'results' && <button disabled={busy} style={{ background: '#0E7C39', color: '#fff', border: 0, borderRadius: 8, padding: '7px 12px' }}>{busy ? 'Saving…' : mode === 'create' ? 'Create draft' : 'Submit response'}</button>}</div>
    </form>
  </div>;
}
