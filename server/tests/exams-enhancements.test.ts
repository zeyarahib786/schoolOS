import request from 'supertest';
import { createApp } from '../src/app';
import { Student } from '../src/models/Student';
import { ExamResult } from '../src/models/ExamResult';
import { User } from '../src/models/User';
import { Message } from '../src/models/Message';
import { Certificate } from '../src/models/Certificate';
import { SaveExamRegisterInput } from '../src/modules/exams/exams.validation';
import { Role } from '../src/types/roles';
const app = createApp();
async function account(role: Role, name: string) {
  const r = await request(app)
    .post('/api/v1/auth/register')
    .send({ name, email: name + '@example.invalid', password: 'StrongPass123', role });
  expect(r.status).toBe(201);
  return r.body.data;
}
const auth = (a: { accessToken: string }) => ({ Authorization: 'Bearer ' + a.accessToken });
async function child(refId: string, links = {}, grade = 'Grade 7 · A') {
  return Student.create({
    refId,
    name: refId,
    grade,
    gender: 'Female',
    roll: '007',
    guardianName: 'QA Parent',
    phone: '123456789',
    ...links,
  });
}
async function exam(a: { accessToken: string }) {
  const r = await request(app)
    .post('/api/v1/exams')
    .set(auth(a))
    .send({ name: 'QA Assessment', term: 'Term 1', subjects: ['Math', 'English'], maxMarks: 50, passMark: 25 });
  expect(r.status).toBe(201);
  return r.body.data;
}
const scores = (marks = 30) => [
  { subject: 'Math', marks },
  { subject: 'English', marks },
];
const save = (
  a: { accessToken: string },
  e: { _id: string },
  entries: SaveExamRegisterInput['entries'],
  correctionReason?: string,
) =>
  request(app)
    .put('/api/v1/exams/' + e._id + '/register')
    .set(auth(a))
    .send({ entries, correctionReason });
describe('Exams production workflows', () => {
  it('persists a real versioned datesheet and rejects stale/unknown/impossible schedule entries', async () => {
    const a = await account('Teacher', 'schedule'),
      e = await exam(a),
      schedule = [{ subject: 'Math', date: '2026-11-10', startTime: '09:00', durationMinutes: 90, venue: 'Room A' }];
    const patch = (body: Record<string, unknown>) =>
      request(app)
        .patch('/api/v1/exams/' + e._id)
        .set(auth(a))
        .send(body);
    expect(
      (await patch({ expectedUpdatedAt: e.updatedAt, schedule: [{ ...schedule[0], date: '2026-02-30' }] })).status,
    ).toBe(400);
    expect(
      (await patch({ expectedUpdatedAt: e.updatedAt, schedule: [{ ...schedule[0], subject: 'Unknown' }] })).status,
    ).toBe(400);
    expect((await patch({ expectedUpdatedAt: e.updatedAt, schedule })).body.data.schedule[0]).toMatchObject(
      schedule[0],
    );
    expect((await patch({ expectedUpdatedAt: e.updatedAt, schedule })).status).toBe(409);
  });
  it('validates complete marks, saves zero honestly and normalizes non-100 maxima/pass thresholds', async () => {
    const a = await account('Teacher', 'marks'),
      e = await exam(a),
      s = await child('QA-MARK');
    expect(
      (await save(a, e, [{ studentId: s.id, scores: [{ subject: 'Math', marks: 30 }], expectedUpdatedAt: null }]))
        .status,
    ).toBe(400);
    expect((await save(a, e, [{ studentId: s.id, scores: scores(51), expectedUpdatedAt: null }])).status).toBe(400);
    expect((await save(a, e, [{ studentId: s.id, scores: scores(30), expectedUpdatedAt: null }])).status).toBe(200);
    const r = await request(app)
      .get('/api/v1/exams/results?examId=' + e._id)
      .set(auth(a));
    expect(r.body.data[0]).toMatchObject({ averagePercent: 60, passing: true });
    expect(
      (
        await request(app)
          .get('/api/v1/exams/' + e._id + '/summary')
          .set(auth(a))
      ).body.data.passRate,
    ).toBe(100);
    expect(
      (
        await request(app)
          .post('/api/v1/exams/' + e._id + '/subjects')
          .set(auth(a))
          .send({ subject: 'Science' })
      ).status,
    ).toBe(409);
    const zero = await child('QA-ZERO');
    expect((await save(a, e, [{ studentId: zero.id, scores: scores(0), expectedUpdatedAt: null }])).status).toBe(200);
  });
  it('requires correction reasons and detects concurrent editors without losing the original scores', async () => {
    const a = await account('Teacher', 'correction'),
      e = await exam(a),
      s = await child('QA-COR');
    await save(a, e, [{ studentId: s.id, scores: scores(), expectedUpdatedAt: null }]);
    const old = await ExamResult.findOne({ student: s.id });
    const entries = [{ studentId: s.id, scores: scores(35), expectedUpdatedAt: old!.updatedAt.toISOString() }];
    expect((await save(a, e, entries)).status).toBe(400);
    const results = await Promise.all([
      save(a, e, entries, 'Moderation correction'),
      save(a, e, [{ ...entries[0], scores: scores(40) }], 'Second editor correction'),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const persisted = await ExamResult.findOne({ student: s.id });
    expect(persisted?.corrections).toHaveLength(1);
    expect(persisted?.corrections[0].previousScores[0].marks).toBe(30);
    expect(
      (
        await request(app)
          .post('/api/v1/exams/results')
          .set(auth(a))
          .send({ examId: e._id, studentId: s.id, scores: scores(49) })
      ).status,
    ).toBe(409);
  });
  it('rolls back a whole register batch if another row is invalid', async () => {
    const a = await account('Teacher', 'rollback'),
      e = await exam(a),
      s = await child('QA-ROLL');
    expect(
      (
        await save(a, e, [
          { studentId: s.id, scores: scores(), expectedUpdatedAt: null },
          { studentId: '000000000000000000000001', scores: scores(), expectedUpdatedAt: null },
        ])
      ).status,
    ).toBe(400);
    expect(await ExamResult.countDocuments({ exam: e._id })).toBe(0);
  });
  it('hides draft results and profile aggregates from families, publishes only owned rows and re-hides on moderation', async () => {
    const a = await account('Principal', 'publish'),
      p = await account('Parent', 'family'),
      u = await account('Student', 'pupil'),
      b = await account('Accountant', 'finance');
    const s = await child('QA-FAM', { guardianUserId: p.user._id, studentUserId: u.user._id }),
      other = await child('QA-STRANGER'),
      e = await exam(a);
    await save(
      a,
      e,
      [s, other].map((st) => ({ studentId: st.id, scores: scores(), expectedUpdatedAt: null })),
    );
    const results = (user: { accessToken: string }, q = '') =>
      request(app)
        .get('/api/v1/exams/results?examId=' + e._id + q)
        .set(auth(user));
    for (const family of [p, u]) {
      expect((await results(family)).body.data).toHaveLength(0);
      const profile = await request(app)
        .get('/api/v1/students/' + s.id)
        .set(auth(family));
      expect(profile.body.data.assessmentResults).toBe(0);
      expect(
        (
          await request(app)
            .get('/api/v1/exams/' + e._id + '/summary')
            .set(auth(family))
        ).status,
      ).toBe(403);
    }
    expect((await results(b)).body.data).toHaveLength(0);
    expect(
      (
        await request(app)
          .post('/api/v1/exams/' + e._id + '/publish')
          .set(auth(a))
      ).status,
    ).toBe(200);
    for (const family of [p, u]) {
      expect((await results(family)).body.data).toHaveLength(1);
      expect((await results(family, '&studentId=' + other.id)).body.data).toHaveLength(0);
      expect((await results(family)).body.data[0].corrections).toBeUndefined();
      expect(
        (
          await request(app)
            .get('/api/v1/students/' + s.id)
            .set(auth(family))
        ).body.data.assessmentResults,
      ).toBe(1);
    }
    expect((await save(a, e, [{ studentId: s.id, scores: scores(40), expectedUpdatedAt: null }])).status).toBe(403);
    await request(app)
      .post('/api/v1/exams/' + e._id + '/reopen')
      .set(auth(a));
    expect((await results(p)).body.data).toHaveLength(0);
    expect(
      (
        await request(app)
          .get('/api/v1/students/' + s.id)
          .set(auth(p))
      ).body.data.assessmentResults,
    ).toBe(0);
  });
  it('generates class-filtered report-card snapshots idempotently and preserves issued marks after moderation', async () => {
    const a = await account('Administrator', 'cards'),
      e = await exam(a),
      s = await child('QA-CARD'),
      other = await child('QA-CARD-B', {}, 'Grade 7 · B');
    await save(
      a,
      e,
      [s, other].map((st) => ({ studentId: st.id, scores: scores(), expectedUpdatedAt: null })),
    );
    await request(app)
      .post('/api/v1/exams/' + e._id + '/publish')
      .set(auth(a));
    const issue = () =>
      request(app)
        .post('/api/v1/exams/' + e._id + '/report-cards')
        .set(auth(a))
        .send({ grade: 'Grade 7 · A' });
    expect((await issue()).body.data).toMatchObject({ generated: 1, alreadyExisted: 0 });
    expect((await issue()).body.data).toMatchObject({ generated: 0, alreadyExisted: 1 });
    expect(await Certificate.countDocuments({ student: other.id })).toBe(0);
    await request(app)
      .post('/api/v1/exams/' + e._id + '/reopen')
      .set(auth(a));
    const old = await ExamResult.findOne({ student: s.id });
    await save(
      a,
      e,
      [{ studentId: s.id, scores: scores(40), expectedUpdatedAt: old!.updatedAt.toISOString() }],
      'Reviewed script',
    );
    await request(app)
      .post('/api/v1/exams/' + e._id + '/publish')
      .set(auth(a));
    await issue();
    expect((await Certificate.findOne({ student: s.id }))?.assessmentSnapshot?.scores[0].marks).toBe(30);
  });
  it('does not round a fractional mark up across a grade or pass boundary', async () => {
    const a = await account('Teacher', 'fractional'),
      e = await exam(a),
      s = await child('QA-FRACTION');
    await save(a, e, [{ studentId: s.id, scores: scores(24.99), expectedUpdatedAt: null }]);
    const rows = await request(app)
      .get('/api/v1/exams/results?examId=' + e._id)
      .set(auth(a));
    expect(rows.body.data[0]).toMatchObject({ averagePercent: 50, passing: false, grade: 'D' });
    expect(
      (
        await request(app)
          .get('/api/v1/exams/' + e._id + '/summary')
          .set(auth(a))
      ).body.data.passCount,
    ).toBe(0);
  });
  it('rejects incomplete historical publication and skips inactive guardian notices', async () => {
    const a = await account('Principal', 'legacy-publish'),
      p = await account('Parent', 'inactive-notices'),
      s = await child('QA-LEGACY', { guardianUserId: p.user._id }),
      e = await exam(a);
    const old = await ExamResult.create({
      exam: e._id,
      student: s._id,
      scores: [{ subject: 'Math', marks: 30 }],
      recordedBy: a.user._id,
    });
    expect(
      (
        await request(app)
          .post('/api/v1/exams/' + e._id + '/publish')
          .set(auth(a))
      ).status,
    ).toBe(400);
    await save(
      a,
      e,
      [{ studentId: s.id, scores: scores(), expectedUpdatedAt: old.updatedAt.toISOString() }],
      'Complete historical record',
    );
    await User.findByIdAndUpdate(p.user._id, { isActive: false });
    const publication = await request(app)
      .post('/api/v1/exams/' + e._id + '/publish')
      .set(auth(a));
    expect(publication.status).toBe(200);
    expect(publication.body.data.notified).toBe(0);
    expect(await Message.countDocuments({ recipient: p.user._id })).toBe(0);
  });
  it('serializes publication against marks and duplicate publications without extra notifications', async () => {
    const a = await account('Principal', 'race-publish'),
      p = await account('Parent', 'race-notices'),
      s = await child('QA-RACE', { guardianUserId: p.user._id }),
      e = await exam(a);
    await save(a, e, [{ studentId: s.id, scores: scores(), expectedUpdatedAt: null }]);
    const old = await ExamResult.findOne({ student: s.id });
    const [first, second, marks] = await Promise.all([
      request(app)
        .post('/api/v1/exams/' + e._id + '/publish')
        .set(auth(a)),
      request(app)
        .post('/api/v1/exams/' + e._id + '/publish')
        .set(auth(a)),
      save(
        a,
        e,
        [{ studentId: s.id, scores: scores(40), expectedUpdatedAt: old!.updatedAt.toISOString() }],
        'Concurrent moderation',
      ),
    ]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect([200, 403]).toContain(marks.status);
    expect(await Message.countDocuments({ recipient: p.user._id })).toBe(1);
    expect((await ExamResult.findOne({ student: s.id }))?.scores[0].marks).toBe(marks.status === 200 ? 40 : 30);
  });
});
