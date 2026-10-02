import { createSurveySchema, submitResponseSchema } from '../../src/modules/surveys/surveys.validation';

const validSurvey = {
  title: 'End of term feedback',
  description: 'A short poll.',
  questions: [{ questionText: 'How was this term?', options: ['Great', 'Okay', 'Poor'] }],
};

describe('createSurveySchema', () => {
  it('accepts a valid survey', () => {
    expect(createSurveySchema.safeParse({ body: validSurvey, params: {}, query: {} }).success).toBe(true);
  });

  it('rejects a question with fewer than 2 options', () => {
    const result = createSurveySchema.safeParse({
      body: { ...validSurvey, questions: [{ questionText: 'X?', options: ['Only one'] }] },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects a survey with zero questions', () => {
    expect(
      createSurveySchema.safeParse({ body: { ...validSurvey, questions: [] }, params: {}, query: {} }).success,
    ).toBe(false);
  });
});

describe('submitResponseSchema', () => {
  it('accepts a valid response', () => {
    const result = submitResponseSchema.safeParse({
      params: { id: '64b7f9c9a1b2c3d4e5f60789' },
      body: { answers: [{ questionIndex: 0, selectedOption: 'Great' }] },
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty answers array', () => {
    const result = submitResponseSchema.safeParse({
      params: { id: '64b7f9c9a1b2c3d4e5f60789' },
      body: { answers: [] },
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects a negative questionIndex', () => {
    const result = submitResponseSchema.safeParse({
      params: { id: '64b7f9c9a1b2c3d4e5f60789' },
      body: { answers: [{ questionIndex: -1, selectedOption: 'X' }] },
      query: {},
    });
    expect(result.success).toBe(false);
  });
});
