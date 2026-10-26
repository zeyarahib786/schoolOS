import request from 'supertest';
import { randomUUID } from 'crypto';
import { createApp } from '../src/app';
import { ClassSection } from '../src/models/ClassSection';
import { TeachingAssignment } from '../src/models/TeachingAssignment';
import { Assignment } from '../src/models/Assignment';
import { Submission } from '../src/models/Submission';
import { Student } from '../src/models/Student';
import { CurriculumUnit } from '../src/models/CurriculumUnit';
import { TeacherAiDraft } from '../src/models/TeacherAiDraft';
import { Message } from '../src/models/Message';
import { Attendance } from '../src/models/Attendance';
import { processOneDelivery } from '../src/modules/notifications/notifications.service';
import { NotificationDelivery } from '../src/models/NotificationDelivery';
import { AiContent } from '../src/modules/lms/lms.ai.validation';
const app = createApp(),
  base = '/api/v1/lms/ai';
async function account(role: string, label = role) {
  const r = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: label, email: label + '@example.invalid', password: 'StrongPass123', role });
  expect(r.status).toBe(201);
  return { ...r.body.data, h: { Authorization: 'Bearer ' + r.body.data.accessToken } };
}
const context = { grade: 'Grade 7 · A', subject: 'Science', academicYear: '2026-2027' };
async function fixture() {
  const t = await account('Teacher'),
    other = await account('Teacher', 'other'),
    s = await account('Student'),
    p = await account('Parent');
  const cls = await ClassSection.create({ grade: 'Grade 7', section: 'A' });
  await TeachingAssignment.create({ teacher: t.user._id, classSection: cls._id, ...context, active: true });
  const student = await Student.create({
    name: 'Fictional child',
    refId: 'AI-001',
    ...context,
    gender: 'Female',
    roll: '1',
    guardianName: 'Fictional guardian',
    phone: '+971501234567',
    studentUserId: s.user._id,
    guardianUserId: p.user._id,
    status: 'Active',
  });
  process.env.TEACHER_AI_ENABLED = 'true';
  process.env.OPENAI_API_KEY = 'test-not-a-real-key';
  process.env.TEACHER_AI_MODEL = 'fictional-test-model';
  return { t, other, s, p, student };
}
const question = {
  id: 'q1',
  type: 'MCQ' as const,
  prompt: 'Which is a plant?',
  options: ['Fern', 'Stone'],
  answer: 'Fern',
  marks: 20,
  rubric: 'Award marks only for Fern',
};
function output(kind = 'Quiz'): AiContent {
  return {
    title: 'Fictional ' + kind,
    body: 'Review this fictional draft.',
    questions: ['Assignment', 'Quiz'].includes(kind) ? [question] : [],
    suggestedScore: kind === 'Feedback' ? 20 : null,
    warnings: [],
  };
}
function provider(content: AiContent) {
  return jest.spyOn(global, 'fetch').mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          status: 'completed',
          output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(content) }] }],
        }),
        { status: 200 },
      ),
  );
}
async function generate(t: Awaited<ReturnType<typeof account>>, kind = 'Quiz', extra: Record<string, unknown> = {}) {
  return request(app)
    .post(base + '/drafts')
    .set(t.h)
    .send({ ...context, kind, topic: 'Plants', questionCount: 1, maxScore: 20, requestId: randomUUID(), ...extra });
}
afterEach(() => {
  jest.restoreAllMocks();
  for (const key of [
    'TEACHER_AI_ENABLED',
    'TEACHER_AI_PROVIDER',
    'GEMINI_API_KEY',
    'GROQ_API_KEY',
    'OPENAI_API_KEY',
    'TEACHER_AI_MODEL',
    'NOTIFICATIONS_ENABLED',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
  ])
    delete process.env[key];
});
describe('Teacher AI Studio', () => {
  it('denies all non-teaching roles and unmapped teachers before contacting provider', async () => {
    const { other, s, p } = await fixture(),
      fetch = provider(output());
    for (const role of [s, p, await account('Accountant')])
      expect(
        (
          await request(app)
            .get(base + '/status')
            .set(role.h)
        ).status,
      ).toBe(403);
    expect((await generate(other)).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('reports unconfigured status truthfully and never returns keys', async () => {
    const { t } = await fixture();
    delete process.env.OPENAI_API_KEY;
    const status = await request(app)
      .get(base + '/status')
      .set(t.h);
    expect(status.body.data.configured).toBe(false);
    expect(JSON.stringify(status.body)).not.toContain('test-not-a-real-key');
    expect((await generate(t)).status).toBe(503);
    expect(await TeacherAiDraft.countDocuments()).toBe(0);
  });
  it('generates private grounded drafts for all five priorities, with pseudonymous numeric progress context', async () => {
    const { t, student } = await fixture();
    await CurriculumUnit.create({
      ...context,
      term: 'Term 1',
      title: 'Plants unit',
      outcomes: 'Describe plant parts',
      framework: 'Fictional framework',
      owner: 'School',
    });
    await Attendance.create({
      student: student._id,
      date: new Date(),
      session: 'AM',
      status: 'Late',
      markedBy: t.user._id,
    });
    const fetch = provider(output('LessonPlan'));
    let r = await generate(t, 'LessonPlan');
    expect(r.status).toBe(201);
    expect(r.body.data.sources[0].title).toBe('Plants unit');
    for (const kind of ['ParentMessage', 'Progress']) {
      fetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'completed',
            output: [{ content: [{ type: 'output_text', text: JSON.stringify(output(kind)) }] }],
          }),
        ),
      );
      r = await generate(t, kind, { studentId: String(student._id) });
      expect(r.status).toBe(201);
      expect(r.body.data.facts.attendancePercent).toBe(100);
    }
    const sent = JSON.stringify(fetch.mock.calls.map((c) => JSON.parse(String(c[1]?.body)).input));
    expect(sent).not.toContain('Fictional child');
    expect(sent).not.toContain('@example.invalid');
    expect(sent).not.toContain(String(student._id));
    expect(await Message.countDocuments()).toBe(0);
    expect(await Assignment.countDocuments()).toBe(0);
  });
  it('persists generation idempotency and rejects changed requests, malformed output and invalid marks', async () => {
    const { t } = await fixture(),
      fetch = provider(output()),
      id = randomUUID();
    const a = await generate(t, 'Quiz', { requestId: id }),
      b = await generate(t, 'Quiz', { requestId: id });
    expect(a.status).toBe(201);
    expect(b.body.data._id).toBe(a.body.data._id);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((await generate(t, 'Quiz', { requestId: id, topic: 'Changed' })).status).toBe(409);
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ status: 'incomplete', output: [] })));
    expect((await generate(t)).status).toBe(502);
    fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'completed',
          output: [
            {
              content: [
                { type: 'output_text', text: JSON.stringify({ ...output(), questions: [{ ...question, marks: 10 }] }) },
              ],
            },
          ],
        }),
      ),
    );
    expect((await generate(t)).status).toBe(400);
    expect(await TeacherAiDraft.countDocuments({ status: 'Failed' })).toBe(2);
    const failed = await TeacherAiDraft.find({ status: 'Failed' });
    expect(failed.every((d) => !!d.failureMessage)).toBe(true);
    expect(failed.map((d) => d.failureMessage).join(' ')).not.toContain('api-key');
  });
  it('keeps draft ownership private and hides revoked scope from saved drafts and student selectors', async () => {
    const { t, other } = await fixture();
    provider(output());
    const d = (await generate(t)).body.data;
    expect(
      (
        await request(app)
          .get(base + '/drafts/' + d._id)
          .set(other.h)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .get(base + '/students')
          .query(context)
          .set(other.h)
      ).status,
    ).toBe(403);
    await TeachingAssignment.updateMany({ teacher: t.user._id }, { $set: { active: false } });
    expect(
      (
        await request(app)
          .get(base + '/drafts')
          .set(t.h)
      ).body.data,
    ).toHaveLength(0);
    expect(
      (
        await request(app)
          .get(base + '/drafts/' + d._id)
          .set(t.h)
      ).status,
    ).toBe(403);
  });
  it('supports reviewed question edits and optimistic locking then applies a quiz only once', async () => {
    const { t, s, p } = await fixture();
    provider(output());
    let d = (await generate(t)).body.data;
    const updated = await request(app)
      .patch(base + '/drafts/' + d._id)
      .set(t.h)
      .send({ expectedUpdatedAt: d.updatedAt, content: { ...d.content, title: 'Edited quiz' } });
    expect(updated.status).toBe(200);
    expect(
      (
        await request(app)
          .patch(base + '/drafts/' + d._id)
          .set(t.h)
          .send({ expectedUpdatedAt: d.updatedAt, content: d.content })
      ).status,
    ).toBe(409);
    d = updated.body.data;
    const apply = {
      expectedUpdatedAt: d.updatedAt,
      reviewed: true,
      action: 'SaveAssignment',
      dueDate: '2099-01-01T08:00:00Z',
      status: 'Published',
    };
    expect(
      (
        await request(app)
          .post(base + '/drafts/' + d._id + '/apply')
          .set(t.h)
          .send({ ...apply, reviewed: false })
      ).status,
    ).toBe(400);
    const [a, b] = await Promise.all([
      request(app)
        .post(base + '/drafts/' + d._id + '/apply')
        .set(t.h)
        .send(apply),
      request(app)
        .post(base + '/drafts/' + d._id + '/apply')
        .set(t.h)
        .send(apply),
    ]);
    expect([a.status, b.status]).toContain(200);
    expect(await Assignment.countDocuments()).toBe(1);
    const assignment = await Assignment.findOne();
    expect(assignment!.title).toBe('Edited quiz');
    for (const family of [s, p]) {
      const list = await request(app).get('/api/v1/lms/assignments').set(family.h);
      const q = list.body.data[0].questions[0];
      expect(q.answer).toBeUndefined();
      expect(q.rubric).toBeUndefined();
      expect(list.body.data[0].history).toHaveLength(0);
    }
  });
  it('accepts structured student answers, rejects invalid/duplicate submissions, protects questions after submission and computes objective marks', async () => {
    const { t, s } = await fixture();
    provider(output());
    const d = (await generate(t)).body.data;
    const applied = await request(app)
      .post(base + '/drafts/' + d._id + '/apply')
      .set(t.h)
      .send({
        expectedUpdatedAt: d.updatedAt,
        reviewed: true,
        action: 'SaveAssignment',
        dueDate: '2099-01-01T08:00:00Z',
        status: 'Published',
      });
    expect(applied.status).toBe(200);
    const id = applied.body.data.appliedRecord,
      path = '/api/v1/lms/assignments/' + id;
    expect(
      (
        await request(app)
          .post(path + '/submit')
          .set(s.h)
          .send({ answers: [] })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post(path + '/submit')
          .set(s.h)
          .send({ answers: [{ questionId: 'q1', value: 'Unknown' }] })
      ).status,
    ).toBe(400);
    const sub = await request(app)
      .post(path + '/submit')
      .set(s.h)
      .send({ answers: [{ questionId: 'q1', value: 'Fern' }] });
    expect(sub.status).toBe(201);
    expect((await Submission.findById(sub.body.data._id))!.objectiveScore).toBe(20);
    expect(
      (
        await request(app)
          .post(path + '/submit')
          .set(s.h)
          .send({ answers: [{ questionId: 'q1', value: 'Stone' }] })
      ).status,
    ).toBe(409);
    const assignment = await Assignment.findById(id);
    expect(
      (
        await request(app)
          .patch(path)
          .set(t.h)
          .send({
            expectedUpdatedAt: assignment!.updatedAt.toISOString(),
            reason: 'Change answer key',
            questions: [{ ...question, answer: 'Stone' }],
          })
      ).status,
    ).toBe(409);
    expect((await request(app).get('/api/v1/lms/submissions').set(s.h)).body.data[0].objectiveScore).toBeUndefined();
  });
  it('drafts grading feedback against a real submission, keeps marks deterministic and requires review before saving', async () => {
    const { t, s } = await fixture();
    const a = await Assignment.create({
      ...context,
      title: 'Quiz',
      description: 'Plant quiz',
      questions: [question],
      dueDate: new Date('2099-01-01'),
      maxScore: 20,
      createdBy: t.user._id,
    });
    const sub = (
      await request(app)
        .post('/api/v1/lms/assignments/' + a._id + '/submit')
        .set(s.h)
        .send({ answers: [{ questionId: 'q1', value: 'Fern' }] })
    ).body.data;
    provider(output('Feedback'));
    const d = await generate(t, 'Feedback', { submissionId: sub._id });
    expect(d.status).toBe(201);
    expect((await Submission.findById(sub._id))!.status).toBe('Submitted');
    const apply = await request(app)
      .post(base + '/drafts/' + d.body.data._id + '/apply')
      .set(t.h)
      .send({ expectedUpdatedAt: d.body.data.updatedAt, reviewed: true, action: 'Grade' });
    expect(apply.status).toBe(200);
    expect((await Submission.findById(sub._id))!.score).toBe(20);
  });
  it('rejects stale source feedback after another assessor changes the grade', async () => {
    const { t, student } = await fixture();
    const a = await Assignment.create({
      ...context,
      title: 'Written work',
      description: 'Explain',
      dueDate: new Date('2099-01-01'),
      maxScore: 20,
      createdBy: t.user._id,
    });
    const sub = await Submission.create({ assignment: a._id, student: student._id, content: 'Student response' });
    provider(output('Feedback'));
    const d = (await generate(t, 'Feedback', { submissionId: String(sub._id) })).body.data;
    await Submission.updateOne({ _id: sub._id }, { $set: { score: 5, status: 'Graded' } });
    expect(
      (
        await request(app)
          .post(base + '/drafts/' + d._id + '/apply')
          .set(t.h)
          .send({ expectedUpdatedAt: d.updatedAt, reviewed: true, action: 'Grade' })
      ).status,
    ).toBe(409);
    expect((await Submission.findById(sub._id))!.score).toBe(5);
  });
  it('sends a reviewed in-app parent draft once and does not invent an external delivery', async () => {
    const { t, student, p } = await fixture();
    provider(output('ParentMessage'));
    const d = (await generate(t, 'ParentMessage', { studentId: String(student._id) })).body.data;
    const apply = { expectedUpdatedAt: d.updatedAt, reviewed: true, action: 'Message', channel: 'InApp' };
    expect(
      (
        await request(app)
          .post(base + '/drafts/' + d._id + '/apply')
          .set(t.h)
          .send(apply)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post(base + '/drafts/' + d._id + '/apply')
          .set(t.h)
          .send(apply)
      ).status,
    ).toBe(200);
    expect(await Message.countDocuments({ recipient: p.user._id })).toBe(1);
    expect(await NotificationDelivery.countDocuments()).toBe(0);
  });
  it('queues reviewed email for office approval and leaves unconfigured SMS draft unapplied', async () => {
    const { t, student } = await fixture();
    provider(output('ParentMessage'));
    process.env.NOTIFICATIONS_ENABLED = 'true';
    process.env.RESEND_API_KEY = 'fictional';
    process.env.RESEND_FROM_EMAIL = 'school@example.invalid';
    let d = (await generate(t, 'ParentMessage', { studentId: String(student._id) })).body.data;
    expect(
      (
        await request(app)
          .post(base + '/drafts/' + d._id + '/apply')
          .set(t.h)
          .send({ expectedUpdatedAt: d.updatedAt, reviewed: true, action: 'Message', channel: 'Email' })
      ).status,
    ).toBe(200);
    expect((await NotificationDelivery.findOne())!.status).toBe('Awaiting approval');
    const parent = student.guardianUserId;
    await Student.updateOne({ _id: student._id }, { $unset: { guardianUserId: 1 } });
    await NotificationDelivery.updateMany({}, { $set: { status: 'Pending' } });
    const fetchCalls = (global.fetch as jest.Mock).mock.calls.length;
    await processOneDelivery();
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCalls);
    expect((await NotificationDelivery.findOne())!.errorCode).toBe('TEACHER_AI_RECIPIENT_CHANGED');
    await Student.updateOne({ _id: student._id }, { $set: { guardianUserId: parent } });

    d = (await generate(t, 'ParentMessage', { studentId: String(student._id) })).body.data;
    expect(
      (
        await request(app)
          .post(base + '/drafts/' + d._id + '/apply')
          .set(t.h)
          .send({ expectedUpdatedAt: d.updatedAt, reviewed: true, action: 'Message', channel: 'SMS' })
      ).status,
    ).toBe(503);
    expect((await TeacherAiDraft.findById(d._id))!.status).toBe('Draft');
  });
});

it.each(['gemini', 'groq'])(
  'runs all five teacher priorities through %s and applies reviewed school actions using the same permissions',
  async (providerName) => {
    const { t, s, student } = await fixture();
    process.env.TEACHER_AI_PROVIDER = providerName;
    process.env.GEMINI_API_KEY = 'fictional-gemini';
    process.env.GROQ_API_KEY = 'fictional-groq';
    const assignment = await Assignment.create({
      ...context,
      title: 'Fictional written response',
      description: 'Explain plant parts',
      dueDate: new Date('2099-01-01'),
      maxScore: 20,
      createdBy: t.user._id,
    });
    const submission = await Submission.create({
      assignment: assignment._id,
      student: student._id,
      content: 'A plant has roots and leaves.',
    });
    const fetch = jest.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
      expect(url).toBe(
        providerName === 'groq'
          ? 'https://api.groq.com/openai/v1/chat/completions'
          : 'https://generativelanguage.googleapis.com/v1beta/interactions',
      );
      const body = JSON.parse(String(init?.body));
      const input = JSON.parse(providerName === 'groq' ? body.messages[1].content : body.input);
      if (providerName === 'groq')
        return new Response(
          JSON.stringify({
            choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(output(input.request.kind)) } }],
          }),
        );
      return new Response(
        JSON.stringify({
          status: 'completed',
          steps: [
            { type: 'model_output', content: [{ type: 'text', text: JSON.stringify(output(input.request.kind)) }] },
          ],
        }),
      );
    });
    for (const kind of ['Assignment', 'Quiz', 'LessonPlan', 'Feedback', 'ParentMessage', 'Progress']) {
      const response = await generate(t, kind, {
        studentId: String(student._id),
        submissionId: String(submission._id),
      });
      expect(response.status).toBe(201);
      const draft = response.body.data;
      expect(draft.provider).toBe(providerName);
      expect(draft.status).toBe('Draft');
      if (['Assignment', 'Quiz', 'Feedback', 'ParentMessage'].includes(kind)) {
        const applied = await request(app)
          .post(base + '/drafts/' + draft._id + '/apply')
          .set(t.h)
          .send({
            reviewed: true,
            expectedUpdatedAt: draft.updatedAt,
            action: ['Assignment', 'Quiz'].includes(kind)
              ? 'SaveAssignment'
              : kind === 'Feedback'
                ? 'Grade'
                : 'Message',
            dueDate: '2099-01-01T08:00:00Z',
            status: 'Published',
          });
        expect(applied.status).toBe(200);
      }
    }
    expect(fetch).toHaveBeenCalledTimes(6);
    expect((await Submission.findById(submission._id))!.status).toBe('Graded');
    const family = await request(app).get('/api/v1/lms/assignments').set(s.h);
    expect(family.body.data.filter((a: { questions: unknown[] }) => a.questions.length)).toHaveLength(2);
    expect(JSON.stringify(family.body.data)).not.toContain('Award marks only for Fern');
  },
);

it('provides structured student answers to the grader without leaking student identity', async () => {
  const { t, student } = await fixture();
  const assignment = await Assignment.create({
    ...context,
    title: 'Fictional structured answer assessment',
    description: 'Explain your answer',
    questions: [
      {
        id: 'q1',
        type: 'ShortAnswer',
        prompt: 'Name a plant part.',
        options: [],
        answer: 'Root',
        marks: 20,
        rubric: 'Credit a correctly named plant part.',
      },
    ],
    dueDate: new Date('2099-01-01'),
    maxScore: 20,
    createdBy: t.user._id,
  });
  const submission = await Submission.create({
    assignment: assignment._id,
    student: student._id,
    content: 'Structured response; see per-question answers.',
    answers: [{ questionId: 'q1', value: 'A root takes in water.' }],
  });
  const fetch = provider(output('Feedback'));
  const response = await generate(t, 'Feedback', { submissionId: String(submission._id) });
  expect(response.status).toBe(201);
  const input = JSON.parse(JSON.parse(String(fetch.mock.calls[0][1]?.body)).input);
  expect(input.studentWork.answers).toEqual([{ questionId: 'q1', value: 'A root takes in water.' }]);
  expect(input.studentWork.response).toBe('Structured response; see per-question answers.');
  expect(JSON.stringify(input)).not.toContain(student.name);
  expect(response.body.data.status).toBe('Draft');
  expect((await Submission.findById(submission._id))!.status).toBe('Submitted');
});
