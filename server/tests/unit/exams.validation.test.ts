import { createExamSchema, recordResultSchema, addSubjectSchema } from '../../src/modules/exams/exams.validation';

const validExam = {
  name: 'Unit Test 3',
  term: 'Term 2',
  subjects: ['Mathematics', 'Science', 'English'],
  maxMarks: 100,
  passMark: 50,
};

describe('createExamSchema', () => {
  it('accepts a valid exam scheme', () => {
    expect(createExamSchema.safeParse({ body: validExam, params: {}, query: {} }).success).toBe(true);
  });

  it('rejects an empty subjects array', () => {
    const result = createExamSchema.safeParse({ body: { ...validExam, subjects: [] }, params: {}, query: {} });
    expect(result.success).toBe(false);
  });

  it('applies default maxMarks/passMark when omitted', () => {
    const { maxMarks, passMark, ...rest } = validExam;
    void maxMarks;
    void passMark;
    const result = createExamSchema.safeParse({ body: rest, params: {}, query: {} });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.maxMarks).toBe(100);
      expect(result.data.body.passMark).toBe(50);
    }
  });

  it('rejects a non-positive maxMarks', () => {
    const result = createExamSchema.safeParse({ body: { ...validExam, maxMarks: 0 }, params: {}, query: {} });
    expect(result.success).toBe(false);
  });
});

describe('recordResultSchema', () => {
  it('accepts a valid result payload', () => {
    const result = recordResultSchema.safeParse({
      body: {
        examId: '64b7f9c9a1b2c3d4e5f60789',
        studentId: '64b7f9c9a1b2c3d4e5f60790',
        scores: [{ subject: 'Mathematics', marks: 85 }],
      },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty scores array', () => {
    const result = recordResultSchema.safeParse({
      body: { examId: '64b7f9c9a1b2c3d4e5f60789', studentId: '64b7f9c9a1b2c3d4e5f60790', scores: [] },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative marks', () => {
    const result = recordResultSchema.safeParse({
      body: {
        examId: '64b7f9c9a1b2c3d4e5f60789',
        studentId: '64b7f9c9a1b2c3d4e5f60790',
        scores: [{ subject: 'Mathematics', marks: -5 }],
      },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('addSubjectSchema', () => {
  it('accepts a valid subject name', () => {
    const result = addSubjectSchema.safeParse({
      params: { id: '64b7f9c9a1b2c3d4e5f60789' },
      body: { subject: 'Geography' },
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty subject name', () => {
    const result = addSubjectSchema.safeParse({
      params: { id: '64b7f9c9a1b2c3d4e5f60789' },
      body: { subject: '' },
      query: {},
    });
    expect(result.success).toBe(false);
  });
});
