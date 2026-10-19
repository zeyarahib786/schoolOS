import request from 'supertest';
import { createApp } from '../src/app';
import { assignmentDeadline } from '../src/modules/lms/lms.dates';
import { SchoolSettings, SETTINGS_ID, DEFAULT_SETTINGS } from '../src/models/SchoolSettings';
const app = createApp();
async function account(role: string) {
  const r = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'QA ' + role, email: role.toLowerCase() + '@example.invalid', role, password: 'StrongPass123' });
  return { h: { Authorization: 'Bearer ' + r.body.data.accessToken }, id: r.body.data.user._id };
}
const base = {
  title: 'QA coursework',
  description: 'Fictional instructions',
  subject: 'Science',
  grade: 'Grade 7 · A',
  dueDate: '2099-01-01',
  maxScore: 20,
  academicYear: '2026-2027',
};
async function fixture() {
  const admin = await account('Administrator'),
    student = await account('Student'),
    parent = await account('Parent');
  const r = await request(app).post('/api/v1/students').set(admin.h).send({
    refId: 'QA-LMS-1',
    name: 'QA child',
    grade: base.grade,
    gender: 'Female',
    roll: '1',
    guardianName: 'QA guardian',
    phone: '+971501234567',
    studentUserId: student.id,
    guardianUserId: parent.id,
  });
  expect(r.status).toBe(201);
  return { admin, student, parent };
}
it('hides drafts and unrelated grade plans from family accounts; validates actual dates and timestamps', async () => {
  const { admin, student, parent } = await fixture();
  expect(
    (
      await request(app)
        .post('/api/v1/lms/assignments')
        .set(admin.h)
        .send({ ...base, status: 'Draft' })
    ).status,
  ).toBe(201);
  expect(
    (
      await request(app)
        .post('/api/v1/lms/assignments')
        .set(admin.h)
        .send({ ...base, title: 'Other grade', grade: 'Grade 8' })
    ).status,
  ).toBe(201);
  for (const u of [student, parent])
    expect((await request(app).get('/api/v1/lms/assignments').set(u.h)).body.data).toHaveLength(0);
  expect(
    (
      await request(app)
        .post('/api/v1/lms/assignments')
        .set(admin.h)
        .send({ ...base, dueDate: '2026-02-30' })
    ).status,
  ).toBe(400);
  expect(
    (
      await request(app)
        .post('/api/v1/lms/assignments')
        .set(admin.h)
        .send({ ...base, dueDate: '2026-03-01T12:00:00' })
    ).status,
  ).toBe(400);
  const published = await request(app).post('/api/v1/lms/assignments').set(admin.h).send(base);
  expect(published.status).toBe(201);
  const family = await request(app).get('/api/v1/lms/assignments').set(student.h).query({ grade: 'Grade 8' });
  expect(family.body.data).toHaveLength(0);
});
it('serializes duplicate submissions, rejects closed/no-late work, and locks submitted grading scope', async () => {
  const { admin, student } = await fixture();
  const assignment = (await request(app).post('/api/v1/lms/assignments').set(admin.h).send(base)).body.data;
  const submissions = await Promise.all(
    [1, 2].map(() =>
      request(app)
        .post(`/api/v1/lms/assignments/${assignment._id}/submit`)
        .set(student.h)
        .send({ content: 'QA response' }),
    ),
  );
  expect(submissions.map((r) => r.status).sort()).toEqual([201, 409]);
  const latest = (await request(app).get('/api/v1/lms/assignments').set(admin.h)).body.data[0];
  expect(
    (
      await request(app)
        .patch('/api/v1/lms/assignments/' + assignment._id)
        .set(admin.h)
        .send({ maxScore: 30, expectedUpdatedAt: latest.updatedAt, reason: 'QA attempted scope change' })
    ).status,
  ).toBe(409);
  const noLate = (
    await request(app)
      .post('/api/v1/lms/assignments')
      .set(admin.h)
      .send({ ...base, title: 'No late', dueDate: '2020-01-01', acceptLate: false })
  ).body.data;
  expect(
    (
      await request(app)
        .post(`/api/v1/lms/assignments/${noLate._id}/submit`)
        .set(student.h)
        .send({ content: 'Late answer' })
    ).status,
  ).toBe(409);
  const closed = (
    await request(app)
      .post('/api/v1/lms/assignments')
      .set(admin.h)
      .send({ ...base, title: 'Closed task', status: 'Closed' })
  ).body.data;
  expect(
    (
      await request(app)
        .post(`/api/v1/lms/assignments/${closed._id}/submit`)
        .set(student.h)
        .send({ content: 'Closed answer' })
    ).status,
  ).toBe(409);
});
it('versioned grading retains before/after scores and family feedback while hiding review reasons', async () => {
  const { admin, student, parent } = await fixture();
  const a = (await request(app).post('/api/v1/lms/assignments').set(admin.h).send(base)).body.data;
  const sub = (
    await request(app)
      .post(`/api/v1/lms/assignments/${a._id}/submit`)
      .set(student.h)
      .send({ content: 'QA answer <img src=x>' })
  ).body.data;
  const graded = await request(app)
    .post(`/api/v1/lms/submissions/${sub._id}/grade`)
    .set(admin.h)
    .send({ score: 15, feedback: 'Useful feedback', expectedUpdatedAt: sub.updatedAt, reason: 'QA assessment rubric' });
  expect(graded.status).toBe(200);
  expect(graded.body.data.gradeHistory).toHaveLength(1);
  expect(
    (
      await request(app)
        .post(`/api/v1/lms/submissions/${sub._id}/grade`)
        .set(admin.h)
        .send({ score: 18, expectedUpdatedAt: sub.updatedAt, reason: 'Stale review' })
    ).status,
  ).toBe(409);
  const corrected = await request(app).post(`/api/v1/lms/submissions/${sub._id}/grade`).set(admin.h).send({
    score: 18,
    feedback: 'Updated feedback',
    expectedUpdatedAt: graded.body.data.updatedAt,
    reason: 'Rubric moderation',
  });
  expect(corrected.status).toBe(200);
  expect(corrected.body.data.gradeHistory[1].previousScore).toBe(15);
  for (const u of [student, parent]) {
    const list = await request(app).get('/api/v1/lms/submissions').set(u.h);
    expect(list.body.data[0].feedback).toBe('Updated feedback');
    expect(list.body.data[0].gradeHistory).toHaveLength(0);
  }
  expect((await request(app).get('/api/v1/lms/submissions?assignmentId=not-an-id').set(admin.h)).status).toBe(400);
});
it('persists course links and guards stale course/assignment reviews', async () => {
  const admin = await account('Administrator');
  const c = (
    await request(app).post('/api/v1/lms/courses').set(admin.h).send({
      title: 'QA Science',
      teacher: 'QA Teacher',
      subject: base.subject,
      grade: base.grade,
      academicYear: base.academicYear,
    })
  ).body.data;
  const a = (
    await request(app)
      .post('/api/v1/lms/assignments')
      .set(admin.h)
      .send({ ...base, course: c._id, status: 'Draft' })
  ).body.data;
  expect(a.course).toBe(c._id);
  expect(
    (
      await request(app)
        .patch('/api/v1/lms/courses/' + c._id)
        .set(admin.h)
        .send({ grade: 'Grade 8', expectedUpdatedAt: c.updatedAt, reason: 'Invalid linked scope' })
    ).status,
  ).toBe(409);
  const pub = await request(app)
    .patch('/api/v1/lms/assignments/' + a._id)
    .set(admin.h)
    .send({ status: 'Published', expectedUpdatedAt: a.updatedAt, reason: 'Coordinator release' });
  expect(pub.status).toBe(200);
  expect(pub.body.data.history).toHaveLength(1);
  expect(
    (
      await request(app)
        .patch('/api/v1/lms/assignments/' + a._id)
        .set(admin.h)
        .send({ status: 'Closed', expectedUpdatedAt: a.updatedAt, reason: 'Stale publication' })
    ).status,
  ).toBe(409);
});
it('uses school timezone end-of-day for date-only deadlines, including daylight saving', async () => {
  await SchoolSettings.findOneAndUpdate(
    { _id: SETTINGS_ID },
    { $set: { ...DEFAULT_SETTINGS, timezone: 'Asia/Dubai' } },
    { upsert: true },
  );
  expect((await assignmentDeadline('2026-10-11')).toISOString()).toBe('2026-10-11T19:59:59.999Z');
  await SchoolSettings.updateOne({ _id: SETTINGS_ID }, { $set: { timezone: 'Europe/London' } });
  expect((await assignmentDeadline('2026-03-29')).toISOString()).toBe('2026-03-29T22:59:59.999Z');
  expect((await assignmentDeadline('2026-03-29T15:30:00+04:00')).toISOString()).toBe('2026-03-29T11:30:00.000Z');
});
