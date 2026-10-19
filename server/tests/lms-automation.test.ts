import request from 'supertest';
import { createApp } from '../src/app';
import { Assignment } from '../src/models/Assignment';
import { Student } from '../src/models/Student';
import { ClassSection } from '../src/models/ClassSection';
import { TeachingAssignment } from '../src/models/TeachingAssignment';
import { InboxNotification } from '../src/models/InboxNotification';
import { NotificationDelivery } from '../src/models/NotificationDelivery';
import { runLmsAutomation } from '../src/modules/lms/lms.automation.service';
import { processOneDelivery } from '../src/modules/notifications/notifications.service';
const app = createApp();
async function account(role: string, label = role) {
  const r = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: label, email: label + '@example.invalid', password: 'StrongPass123', role });
  expect(r.status).toBe(201);
  return { ...r.body.data, h: { Authorization: 'Bearer ' + r.body.data.accessToken } };
}
const input = {
  title: 'Fictional homework',
  description: 'Complete exercises',
  subject: 'Science',
  grade: 'Grade 7 · A',
  academicYear: '2026-2027',
  dueDate: '2099-01-01',
  maxScore: 20,
  status: 'Draft',
};
async function mapped() {
  const a = await account('Administrator'),
    t = await account('Teacher'),
    other = await account('Teacher', 'other-teacher');
  const c = await ClassSection.create({ grade: 'Grade 7', section: 'A' }),
    d = await ClassSection.create({ grade: 'Grade 7', section: 'B' });
  for (const section of [c, d])
    expect(
      (
        await request(app)
          .post('/api/v1/lms/teaching-assignments')
          .set(a.h)
          .send({
            teacher: t.user._id,
            classSection: String(section._id),
            subject: 'Science',
            academicYear: '2026-2027',
          })
      ).status,
    ).toBe(201);
  return { a, t, other, c, d };
}
async function child(user: string, parent: string, grade = 'Grade 7 · A', ref = 'QA-CHILD') {
  return Student.create({
    name: 'Fictional child',
    refId: ref,
    grade,
    gender: 'Female',
    roll: '1',
    guardianName: 'Fictional parent',
    phone: '+971501234567',
    studentUserId: user,
    guardianUserId: parent,
    status: 'Active',
  });
}
afterEach(() => {
  delete process.env.NOTIFICATIONS_ENABLED;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  jest.restoreAllMocks();
});
describe('Teacher assignment automation', () => {
  it('enforces teacher mapping for creates, reads, course edits and grading across subjects/classes', async () => {
    const { a, t, other } = await mapped();
    expect((await request(app).post('/api/v1/lms/assignments').set(other.h).send(input)).status).toBe(403);
    expect(
      (
        await request(app)
          .post('/api/v1/lms/assignments')
          .set(t.h)
          .send({ ...input, subject: 'Math' })
      ).status,
    ).toBe(403);
    const own = await request(app).post('/api/v1/lms/assignments').set(t.h).send(input);
    expect(own.status).toBe(201);
    expect((await request(app).get('/api/v1/lms/assignments').set(other.h)).body.data).toHaveLength(0);
    expect(
      (
        await request(app)
          .patch('/api/v1/lms/assignments/' + own.body.data._id)
          .set(other.h)
          .send({ title: 'Hijack', expectedUpdatedAt: own.body.data.updatedAt, reason: 'Try wrong account' })
      ).status,
    ).toBe(403);
    expect((await request(app).get('/api/v1/lms/teaching-options').set(t.h)).status).toBe(403);
    const course = (
      await request(app).post('/api/v1/lms/courses').set(t.h).send({
        title: 'Science course',
        teacher: 'Display label',
        grade: input.grade,
        subject: input.subject,
        academicYear: input.academicYear,
      })
    ).body.data;
    expect(
      (
        await request(app)
          .patch('/api/v1/lms/courses/' + course._id)
          .set(other.h)
          .send({ teacher: 'Hijack', expectedUpdatedAt: course.updatedAt, reason: 'Try wrong account' })
      ).status,
    ).toBe(403);
    expect((await request(app).get('/api/v1/lms/courses').set(other.h)).body.data).toHaveLength(0);
    const outsider = await request(app)
      .post('/api/v1/lms/assignments')
      .set(a.h)
      .send({ ...input, grade: 'Grade 8 · A' });
    expect(
      (await request(app).get('/api/v1/lms/assignments?grade=Grade%208%20%C2%B7%20A').set(t.h)).body.data,
    ).toHaveLength(0);
    expect(outsider.status).toBe(201);
  });
  it('saves private/shared templates without allowing teachers to change school-wide visibility', async () => {
    const { a, t, other } = await mapped(),
      body = {
        name: 'Science practice',
        title: input.title,
        description: input.description,
        subject: 'Science',
        maxScore: 20,
      };
    expect(
      (
        await request(app)
          .post('/api/v1/lms/templates')
          .set(t.h)
          .send({ ...body, shared: true })
      ).status,
    ).toBe(403);
    expect((await request(app).post('/api/v1/lms/templates').set(t.h).send(body)).status).toBe(201);
    expect((await request(app).get('/api/v1/lms/templates').set(other.h)).body.data).toHaveLength(0);
    expect(
      (
        await request(app)
          .post('/api/v1/lms/templates')
          .set(a.h)
          .send({ ...body, shared: true })
      ).status,
    ).toBe(201);
    expect((await request(app).get('/api/v1/lms/templates').set(other.h)).body.data).toHaveLength(1);
  });
  it('creates multiple section assignments atomically and replays without duplicates', async () => {
    const { t } = await mapped(),
      payload = { assignment: input, grades: ['Grade 7 · A', 'Grade 7 · B'], idempotencyKey: 'batch-assign-01' };
    const send = () => request(app).post('/api/v1/lms/assignments/batch').set(t.h).send(payload);
    expect((await send()).status).toBe(201);
    expect((await send()).body.data).toHaveLength(2);
    expect(await Assignment.countDocuments()).toBe(2);
    expect(
      (
        await request(app)
          .post('/api/v1/lms/assignments/batch')
          .set(t.h)
          .send({ ...payload, assignment: { ...input, title: 'Changed' } })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app)
          .post('/api/v1/lms/assignments/batch')
          .set(t.h)
          .send({ ...payload, idempotencyKey: 'batch-assign-02', grades: ['Grade 7 · A', 'Grade 8 · A'] })
      ).status,
    ).toBe(403);
    expect(await Assignment.countDocuments()).toBe(2);
  });
  it('publishes due schedules once and scopes notifications to active linked students and parents', async () => {
    const { t } = await mapped(),
      s = await account('Student'),
      p = await account('Parent'),
      outside = await account('Student', 'outside');
    await child(s.user._id, p.user._id);
    await child(outside.user._id, p.user._id, 'Grade 8 · A', 'OUTSIDE');
    const at = new Date(Date.now() + 3600000),
      published = await request(app)
        .post('/api/v1/lms/assignments')
        .set(t.h)
        .send({ ...input, status: 'Scheduled', publishAt: at.toISOString() });
    expect(published.status).toBe(201);
    expect((await request(app).get('/api/v1/lms/assignments').set(s.h)).body.data).toHaveLength(0);
    await runLmsAutomation(new Date(at.getTime() + 1000));
    await runLmsAutomation(new Date(at.getTime() + 2000));
    expect((await Assignment.findById(published.body.data._id))?.status).toBe('Published');
    expect(await InboxNotification.countDocuments({ module: 'lms' })).toBe(2);
    expect((await request(app).get('/api/v1/inbox').set(outside.h)).body.data).toHaveLength(0);
    expect((await request(app).get('/api/v1/lms/assignments').set(s.h)).body.data).toHaveLength(1);
  });
  it('stops scheduled publishing after a teaching assignment is revoked', async () => {
    const { t } = await mapped(),
      at = new Date(Date.now() + 3600000);
    const row = (
      await request(app)
        .post('/api/v1/lms/assignments')
        .set(t.h)
        .send({ ...input, status: 'Scheduled', publishAt: at.toISOString() })
    ).body.data;
    await TeachingAssignment.updateMany({ teacher: t.user._id }, { $set: { active: false } });
    await runLmsAutomation(new Date(at.getTime() + 1000));
    expect((await Assignment.findById(row._id))?.status).toBe('Draft');
    expect(await InboxNotification.countDocuments({ title: 'Assignment needs review' })).toBe(1);
  });
  it('requires office approval for teacher email requests and rechecks recipients before sending', async () => {
    const { t, a } = await mapped(),
      s = await account('Student'),
      p = await account('Parent');
    await child(s.user._id, p.user._id);
    process.env.NOTIFICATIONS_ENABLED = 'true';
    process.env.RESEND_API_KEY = 'fictional';
    process.env.RESEND_FROM_EMAIL = 'school@example.invalid';
    const row = await request(app)
      .post('/api/v1/lms/assignments')
      .set(t.h)
      .send({ ...input, status: 'Published', notifyEmail: true });
    expect(row.status).toBe(201);
    await runLmsAutomation();
    await runLmsAutomation();
    expect(await NotificationDelivery.countDocuments()).toBe(2);
    expect(await NotificationDelivery.countDocuments({ status: 'Awaiting approval' })).toBe(2);
    const job = await NotificationDelivery.findOne({ recipient: p.user._id });
    expect(
      (
        await request(app)
          .post('/api/v1/notifications/' + job!._id + '/approve')
          .set(a.h)
      ).status,
    ).toBe(200);
    await Student.updateMany({ guardianUserId: p.user._id }, { $unset: { guardianUserId: 1 } });
    await processOneDelivery();
    expect((await NotificationDelivery.findById(job!._id))?.errorCode).toBe('ASSIGNMENT_RECIPIENT_CHANGED');
  });
  it('rejects invalid schedules and never exposes future coursework to families', async () => {
    const { t } = await mapped();
    for (const publishAt of ['2020-01-01T00:00:00Z', '2100-01-01T00:00:00Z'])
      expect(
        (
          await request(app)
            .post('/api/v1/lms/assignments')
            .set(t.h)
            .send({ ...input, status: 'Scheduled', publishAt })
        ).status,
      ).toBe(400);
    const p = await account('Parent');
    expect((await request(app).get('/api/v1/lms/templates').set(p.h)).status).toBe(403);
    expect((await request(app).get('/api/v1/lms/teaching-assignments').set(p.h)).status).toBe(403);
  });
  it('restricts submissions and grades to the assigned teacher, and ignores archived classes', async () => {
    const { t, other, c } = await mapped(),
      student = await account('Student'),
      parent = await account('Parent');
    await child(student.user._id, parent.user._id);
    const a = (
      await request(app)
        .post('/api/v1/lms/assignments')
        .set(t.h)
        .send({ ...input, status: 'Published' })
    ).body.data;
    const submitted = await request(app)
      .post('/api/v1/lms/assignments/' + a._id + '/submit')
      .set(student.h)
      .send({ content: 'Fictional work' });
    expect(submitted.status).toBe(201);
    expect(
      (
        await request(app)
          .get('/api/v1/lms/submissions?assignmentId=' + a._id)
          .set(other.h)
      ).body.data,
    ).toHaveLength(0);
    const grading = {
      score: 15,
      feedback: 'Good work',
      reason: 'Reviewed against rubric',
      expectedUpdatedAt: submitted.body.data.updatedAt,
    };
    expect(
      (
        await request(app)
          .post('/api/v1/lms/submissions/' + submitted.body.data._id + '/grade')
          .set(other.h)
          .send(grading)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post('/api/v1/lms/submissions/' + submitted.body.data._id + '/grade')
          .set(t.h)
          .send(grading)
      ).status,
    ).toBe(200);
    await ClassSection.updateOne({ _id: c._id }, { $set: { status: 'Archived' } });
    expect((await request(app).get('/api/v1/lms/assignments').set(t.h)).body.data).toHaveLength(0);
  });
  it('deduplicates inbox events when workers process the same publication concurrently', async () => {
    const { t } = await mapped(),
      student = await account('Student'),
      parent = await account('Parent');
    await child(student.user._id, parent.user._id);
    await request(app)
      .post('/api/v1/lms/assignments')
      .set(t.h)
      .send({ ...input, status: 'Published' });
    await Promise.all([runLmsAutomation(), runLmsAutomation()]);
    expect(await InboxNotification.countDocuments({ module: 'lms' })).toBe(2);
  });
});
