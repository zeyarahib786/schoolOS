import { assessmentSchema, assessAnswers, validateAssessment } from '../../src/modules/lms/lms.assessment';
import { generateTeacherContent, teacherAiJsonSchema } from '../../src/modules/lms/lms.ai.provider';
const q = {
  id: 'q1',
  type: 'MCQ' as const,
  prompt: 'Choose',
  options: ['A', 'B'],
  answer: 'A',
  marks: 10,
  rubric: 'Exact match',
};
afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.OPENAI_API_KEY;
  delete process.env.TEACHER_AI_ENABLED;
  delete process.env.TEACHER_AI_MODEL;
});
it('validates unique ids, distinct MCQ choices, exact keys, short-answer shape and mark totals', () => {
  expect(assessmentSchema.safeParse([q]).success).toBe(true);
  for (const questions of [
    [q, q],
    [{ ...q, answer: 'C' }],
    [{ ...q, options: ['A', 'A'] }],
    [{ ...q, type: 'ShortAnswer' }],
  ])
    expect(assessmentSchema.safeParse(questions).success).toBe(false);
  expect(() => validateAssessment([q], 20)).toThrow('Question marks');
  expect(assessAnswers([q], [{ questionId: 'q1', value: 'A' }]).objectiveScore).toBe(10);
  expect(assessAnswers([q], [{ questionId: 'q1', value: 'B' }]).objectiveScore).toBe(0);
  expect(() => assessAnswers([q], [{ questionId: 'q1', value: 'C' }])).toThrow('invalid');
});
it('uses a fixed provider origin, store:false, strict response schema and no auto-execution tools', async () => {
  process.env.TEACHER_AI_ENABLED = 'true';
  process.env.OPENAI_API_KEY = 'fictional';
  process.env.TEACHER_AI_MODEL = 'fixture-model';
  const content = { title: 'Fixture', body: 'Draft', questions: [], suggestedScore: null, warnings: [] };
  const fetch = jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'completed',
          output: [{ content: [{ type: 'output_text', text: JSON.stringify(content) }] }],
        }),
      ),
    );
  expect(await generateTeacherContent({ topic: 'Fictional' })).toEqual(content);
  const [url, init] = fetch.mock.calls[0],
    body = JSON.parse(String(init?.body));
  expect(url).toBe('https://api.openai.com/v1/responses');
  expect(body.store).toBe(false);
  expect(body.tools).toBeUndefined();
  expect(body.text.format.schema).toEqual(teacherAiJsonSchema);
  expect(body.text.format.strict).toBe(true);
  expect(body.model).toBe('fixture-model');
});
it('returns safe provider errors rather than exposing credentials or upstream bodies', async () => {
  process.env.TEACHER_AI_ENABLED = 'true';
  process.env.OPENAI_API_KEY = 'fictional-secret';
  process.env.TEACHER_AI_MODEL = 'fixture-model';
  const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('secret provider message', { status: 401 }));
  await expect(generateTeacherContent({})).rejects.toMatchObject({ statusCode: 502, code: 'AI_UNAVAILABLE' });
  fetch.mockRejectedValueOnce(new Error('secret'));
  await expect(generateTeacherContent({})).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
  fetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'refusal', refusal: 'No' }] }] })),
  );
  await expect(generateTeacherContent({})).rejects.toMatchObject({ code: 'AI_INVALID_OUTPUT' });
});
