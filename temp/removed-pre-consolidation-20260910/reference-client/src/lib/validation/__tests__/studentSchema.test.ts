import { describe, it, expect } from 'vitest';
import { validateStudentForm } from '../studentSchema';

const validValues = {
  refId: 'ANS-1042',
  name: 'Fatima Al Hashimi',
  grade: 'Grade 10 · A',
  gender: 'Female',
  roll: '12',
  guardianName: 'Khalid Al Hashimi',
  phone: '+971501234567',
};

describe('validateStudentForm', () => {
  it('accepts a fully valid submission', () => {
    const result = validateStudentForm(validValues);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.name).toBe('Fatima Al Hashimi');
    }
  });

  it('rejects an empty required field with a field-specific message', () => {
    const result = validateStudentForm({ ...validValues, name: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.name).toBeDefined();
    }
  });

  it('reports every invalid field, not just the first one', () => {
    const result = validateStudentForm({ ...validValues, name: '', refId: '', phone: 'bad' });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(Object.keys(result.errors)).toEqual(expect.arrayContaining(['name', 'refId', 'phone']));
    }
  });

  it('rejects an invalid phone format', () => {
    const result = validateStudentForm({ ...validValues, phone: 'call me maybe!!' });
    expect(result.valid).toBe(false);
  });

  it('rejects a gender value outside the enum', () => {
    const result = validateStudentForm({ ...validValues, gender: 'Other' });
    expect(result.valid).toBe(false);
  });

  it('trims whitespace-only input and treats it as missing', () => {
    const result = validateStudentForm({ ...validValues, name: '   ' });
    expect(result.valid).toBe(false);
  });

  it('rejects completely missing fields (undefined, not just empty string)', () => {
    const { name: _name, ...withoutName } = validValues;
    void _name;
    const result = validateStudentForm(withoutName);
    expect(result.valid).toBe(false);
  });
});
