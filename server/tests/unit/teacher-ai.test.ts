import { assessmentSchema, assessAnswers, validateAssessment } from '../../src/modules/lms/lms.assessment';
import {
  generateTeacherContent,
  teacherAiJsonSchema,
  teacherAiConfig,
  teacherAiOutputSchema,
} from '../../src/modules/lms/lms.ai.provider';
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
  delete process.env.GROQ_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.TEACHER_AI_PROVIDER;
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
  const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
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

const fixtureContent = { title: 'Gemini fixture', body: 'Draft', questions: [], suggestedScore: null, warnings: [] };
function geminiConfig() {
  process.env.TEACHER_AI_ENABLED = 'true';
  process.env.TEACHER_AI_PROVIDER = 'gemini';
  process.env.GEMINI_API_KEY = 'fictional-gemini';
  process.env.TEACHER_AI_MODEL = 'fixture-model';
}
it('selects only the configured provider credentials and rejects invalid provider/model config', () => {
  geminiConfig();
  expect(teacherAiConfig()).toMatchObject({ provider: 'gemini', configured: true });
  delete process.env.GEMINI_API_KEY;
  process.env.OPENAI_API_KEY = 'other-provider-key';
  expect(teacherAiConfig().configured).toBe(false);
  expect(teacherAiConfig().reason).toContain('GEMINI_API_KEY');
  process.env.TEACHER_AI_PROVIDER = 'unknown';
  expect(teacherAiConfig().configured).toBe(false);
  geminiConfig();
  process.env.TEACHER_AI_MODEL = 'https://example.invalid/model';
  expect(teacherAiConfig().configured).toBe(false);
  delete process.env.TEACHER_AI_PROVIDER;
  process.env.TEACHER_AI_MODEL = 'fixture-model';
  expect(teacherAiConfig()).toMatchObject({ provider: 'openai', configured: true });
});
it('uses Gemini stateless structured output, key header, fixed origin and only final text', async () => {
  const timeout = jest.spyOn(AbortSignal, 'timeout');
  geminiConfig();
  process.env.OPENAI_API_KEY = 'must-not-send';
  const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        status: 'completed',
        steps: [
          { type: 'thought', content: [{ type: 'text', text: 'secret reasoning' }] },
          { type: 'model_output', content: [{ type: 'text', text: JSON.stringify(fixtureContent) }] },
        ],
      }),
    ),
  );
  expect(await generateTeacherContent({ topic: 'Fictional' })).toEqual(fixtureContent);
  const [url, init] = fetch.mock.calls[0],
    body = JSON.parse(String(init?.body));
  expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/interactions');
  expect(init?.headers).toEqual({ 'Content-Type': 'application/json', 'x-goog-api-key': 'fictional-gemini' });
  expect(init?.redirect).toBe('error');
  expect(timeout).toHaveBeenCalledWith(120000);
  expect(body.store).toBe(false);
  expect(body.response_format).toEqual({ type: 'text', mime_type: 'application/json', schema: teacherAiJsonSchema });
  expect(body.generation_config.max_output_tokens).toBe(9000);
  expect(body.system_instruction).toContain('never execute actions');
  expect(body.tools).toBeUndefined();
  expect(JSON.stringify(body)).not.toContain('must-not-send');
});
it.each([
  { status: 'in_progress', steps: [] },
  { status: 'failed', steps: [] },
  { status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'refusal', text: 'Blocked' }] }] },
  { status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: 'not json' }] }] },
  {
    status: 'completed',
    steps: [{ type: 'model_output', content: [{ type: 'text', text: '{"title":"Missing required fields"}' }] }],
  },
])('rejects partial, blocked or malformed Gemini output %#', async (body) => {
  geminiConfig();
  jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body)));
  await expect(generateTeacherContent({})).rejects.toMatchObject({ code: 'AI_INVALID_OUTPUT' });
});
it('does not fall back to another provider on a Gemini quota error', async () => {
  geminiConfig();
  process.env.OPENAI_API_KEY = 'another-key';
  const fetch = jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(new Response('private upstream details', { status: 429 }));
  await expect(generateTeacherContent({})).rejects.toMatchObject({ statusCode: 429, code: 'AI_UNAVAILABLE' });
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('uses low thinking for Gemini 3 classroom drafts without adding unsupported settings to other models', async () => {
  geminiConfig();
  process.env.TEACHER_AI_MODEL = 'gemini-3.8-flash';
  const fetch = jest.spyOn(global, 'fetch').mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          status: 'completed',
          steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(fixtureContent) }] }],
        }),
      ),
  );
  await generateTeacherContent({});
  expect(JSON.parse(String(fetch.mock.calls[0][1]?.body)).generation_config.thinking_level).toBe('low');
  process.env.TEACHER_AI_MODEL = 'gemini-2.5-flash';
  await generateTeacherContent({});
  expect(JSON.parse(String(fetch.mock.calls[1][1]?.body)).generation_config.thinking_level).toBeUndefined();
});

it.each([
  [429, 'quota or rate limit'],
  [403, 'access denied'],
  [404, 'model is unavailable'],
])('returns actionable safe provider failures for HTTP %s', async (status, message) => {
  geminiConfig();
  jest.spyOn(global, 'fetch').mockResolvedValue(new Response('private-provider-secret', { status }));
  await expect(generateTeacherContent({})).rejects.toMatchObject({ message: expect.stringContaining(message) });
});

function groqConfig() {
  process.env.TEACHER_AI_ENABLED = 'true';
  process.env.TEACHER_AI_PROVIDER = 'groq';
  process.env.TEACHER_AI_MODEL = 'openai/gpt-oss-20b';
  process.env.GROQ_API_KEY = 'fictional-groq-key';
}
it('uses Groq credentials only at the fixed Groq endpoint with strict structured output', async () => {
  groqConfig();
  process.env.OPENAI_API_KEY = 'must-not-send';
  process.env.GEMINI_API_KEY = 'must-not-send-either';
  expect(teacherAiConfig()).toMatchObject({ configured: true, provider: 'groq' });
  const fetch = jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(fixtureContent) } }] }),
      ),
    );
  expect(await generateTeacherContent({ topic: 'Plants' })).toEqual(fixtureContent);
  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
  expect(init?.headers).toEqual({ Authorization: 'Bearer fictional-groq-key', 'Content-Type': 'application/json' });
  const body = JSON.parse(String(init?.body));
  expect(body.response_format.json_schema).toEqual({
    name: 'teacher_draft',
    strict: true,
    schema: teacherAiJsonSchema,
  });
  expect(body.messages[1].content).toBe(JSON.stringify({ topic: 'Plants' }));
  expect(body.max_completion_tokens).toBe(4096);
  expect(body).not.toHaveProperty('tools');
});
it('does not consider Groq configured using a different provider key', () => {
  groqConfig();
  delete process.env.GROQ_API_KEY;
  process.env.OPENAI_API_KEY = 'wrong-provider';
  expect(teacherAiConfig().configured).toBe(false);
  expect(teacherAiConfig().reason).toContain('GROQ_API_KEY');
});
it.each(['length', 'content_filter', 'tool_calls'])(
  'rejects incomplete Groq output with finish reason %s',
  async (finish_reason) => {
    groqConfig();
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ finish_reason, message: { content: JSON.stringify(fixtureContent) } }] }),
        ),
      );
    await expect(generateTeacherContent({})).rejects.toMatchObject({ code: 'AI_INVALID_OUTPUT' });
  },
);
it('does not switch providers when Groq is rate limited', async () => {
  groqConfig();
  const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('private upstream error', { status: 429 }));
  await expect(generateTeacherContent({})).rejects.toMatchObject({
    statusCode: 429,
    message: expect.stringContaining('quota or rate limit'),
  });
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('constrains generated question identifiers and exact option answer format in the provider schema', () => {
  expect(teacherAiJsonSchema.properties.questions.items.properties.id.pattern).toBe('^q[1-9][0-9]?$');
  expect(teacherAiJsonSchema.properties.questions.items.properties.answer.description).toContain('exact complete text');
});
it('reports invalid field paths without exposing generated content', async () => {
  groqConfig();
  const invalid = { ...fixtureContent, questions: [{ ...q, id: '1', prompt: 'private student information' }] };
  jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(invalid) } }] }),
      ),
    );
  await expect(generateTeacherContent({})).rejects.toMatchObject({
    message: expect.stringContaining('questions.0.id'),
  });
  await expect(generateTeacherContent({})).rejects.not.toMatchObject({
    message: expect.stringContaining('private student information'),
  });
});
it('distinguishes truncated Groq responses from invalid fields', async () => {
  groqConfig();
  jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: '{}' } }] })),
    );
  await expect(generateTeacherContent({})).rejects.toMatchObject({
    message: expect.stringContaining('response limit'),
  });
});

it('uses task-specific schemas so grading cannot echo assessment questions', () => {
  const feedback = teacherAiOutputSchema({ request: { kind: 'Feedback' }, facts: { maxScore: 10 } });
  expect(feedback.properties.questions.maxItems).toBe(0);
  expect(feedback.properties.suggestedScore).toEqual({ type: 'number', minimum: 0, maximum: 10 });
  expect(feedback.properties.body.maxLength).toBe(2000);
  for (const kind of ['LessonPlan', 'ParentMessage', 'Progress']) {
    const schema = teacherAiOutputSchema({ request: { kind } });
    expect(schema.properties.questions.maxItems).toBe(0);
    expect(schema.properties.suggestedScore.type).toBe('null');
  }
  const quiz = teacherAiOutputSchema({ request: { kind: 'Quiz', questionCount: 2 } });
  expect(quiz.properties.questions).toMatchObject({ minItems: 2, maxItems: 2 });
});
