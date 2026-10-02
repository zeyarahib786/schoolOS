import { createAssignmentSchema, submitSchema, gradeSchema } from '../../src/modules/lms/lms.validation';

const validAssignment = {
  title: 'Algebra Homework 3',
  description: 'Complete exercises 1-10.',
  subject: 'Mathematics',
  grade: 'Grade 10 · A',
  dueDate: '2026-06-20',
  maxScore: 100,
};

describe('createAssignmentSchema', () => {
  it('accepts a valid assignment', () => {
    expect(createAssignmentSchema.safeParse({ body: validAssignment, params: {}, query: {} }).success).toBe(true);
  });

  it('rejects a non-positive maxScore', () => {
    expect(
      createAssignmentSchema.safeParse({ body: { ...validAssignment, maxScore: 0 }, params: {}, query: {} }).success,
    ).toBe(false);
  });

  it('rejects an invalid dueDate', () => {
    expect(
      createAssignmentSchema.safeParse({ body: { ...validAssignment, dueDate: 'next Friday' }, params: {}, query: {} })
        .success,
    ).toBe(false);
  });
});

describe('submitSchema', () => {
  it('accepts valid content', () => {
    const result = submitSchema.safeParse({
      params: { id: '64b7f9c9a1b2c3d4e5f60789' },
      body: { content: 'My answer to the assignment.' },
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty content', () => {
    const result = submitSchema.safeParse({
      params: { id: '64b7f9c9a1b2c3d4e5f60789' },
      body: { content: '' },
      query: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('gradeSchema', () => {
  it('accepts a valid score', () => {
    const result = gradeSchema.safeParse({
      params: { id: '64b7f9c9a1b2c3d4e5f60789' },
      body: { score: 85, feedback: 'Well done' },
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects a negative score', () => {
    const result = gradeSchema.safeParse({
      params: { id: '64b7f9c9a1b2c3d4e5f60789' },
      body: { score: -1 },
      query: {},
    });
    expect(result.success).toBe(false);
  });
});
