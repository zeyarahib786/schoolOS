import { FormEvent, useEffect, useRef, useState } from 'react';
import { validateStudentForm, StudentFormValues } from '../../lib/validation/studentSchema';
import * as studentsApi from './students.api';

interface AddStudentModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const emptyForm: StudentFormValues = {
  refId: '',
  name: '',
  grade: '',
  gender: 'Female',
  roll: '',
  guardianName: '',
  phone: '',
};

/** Accessible modal: aria-modal + role=dialog, labelled by its own heading, closes on Escape,
 * and returns focus to the triggering element on close - the WCAG 2.1 AA baseline for a
 * dialog that the prototype's own detailDrawer()/formDrawer() pattern already followed. */
export function AddStudentModal({ onClose, onCreated }: AddStudentModalProps): JSX.Element {
  const [values, setValues] = useState<StudentFormValues>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement;
    dialogRef.current?.querySelector<HTMLElement>('input')?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [onClose]);

  function setField<K extends keyof StudentFormValues>(key: K, value: StudentFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitError(null);
    const result = validateStudentForm(values);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await studentsApi.createStudent({
        ...result.data,
        feeStatus: 'Pending',
        attendancePct: 100,
        gpa: 0,
        status: 'Active',
      });
      onCreated();
      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'Could not create student - please try again';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const fields: Array<{ key: keyof StudentFormValues; label: string; type?: string }> = [
    { key: 'refId', label: 'Reference ID' },
    { key: 'name', label: 'Full name' },
    { key: 'grade', label: 'Grade' },
    { key: 'roll', label: 'Roll number' },
    { key: 'guardianName', label: 'Guardian name' },
    { key: 'phone', label: 'Phone', type: 'tel' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-student-title"
        style={{ background: '#fff', borderRadius: 16, padding: 24, width: 420, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <h2 id="add-student-title" style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>
          Add student
        </h2>
        <form onSubmit={handleSubmit} noValidate>
          {fields.map((f) => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label htmlFor={f.key} style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                {f.label}
              </label>
              <input
                id={f.key}
                type={f.type ?? 'text'}
                value={values[f.key]}
                aria-invalid={Boolean(errors[f.key])}
                aria-describedby={errors[f.key] ? `${f.key}-error` : undefined}
                onChange={(e) => setField(f.key, e.target.value as StudentFormValues[typeof f.key])}
                style={{
                  width: '100%',
                  height: 38,
                  borderRadius: 8,
                  border: `1px solid ${errors[f.key] ? '#DC2626' : '#E2E8F0'}`,
                  padding: '0 10px',
                }}
              />
              {errors[f.key] && (
                <span
                  id={`${f.key}-error`}
                  role="alert"
                  style={{ fontSize: 11.5, color: '#DC2626', display: 'block', marginTop: 3 }}
                >
                  {errors[f.key]}
                </span>
              )}
            </div>
          ))}

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="gender" style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Gender
            </label>
            <select
              id="gender"
              value={values.gender}
              onChange={(e) => setField('gender', e.target.value as StudentFormValues['gender'])}
              style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px' }}
            >
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>
          </div>

          {submitError && (
            <div
              role="alert"
              style={{
                background: '#FDECEC',
                color: '#B42318',
                fontSize: 12.5,
                padding: '8px 12px',
                borderRadius: 8,
                marginBottom: 14,
              }}
            >
              {submitError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: '#0E7C39',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {submitting ? 'Saving…' : 'Save student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
