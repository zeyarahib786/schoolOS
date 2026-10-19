import request from 'supertest';
import { createApp } from '../src/app';
import { CurriculumUnit } from '../src/models/CurriculumUnit';
import { migrateCurriculumScope } from '../src/modules/curriculum/curriculum.migrate';
const app = createApp();
async function account(role = 'Administrator') {
  const r = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'Fictional Curriculum ' + role,
      email: role.toLowerCase() + '@example.invalid',
      password: 'StrongPass123',
      role,
    });
  return { Authorization: 'Bearer ' + r.body.data.accessToken };
}
const unit = {
  subject: 'Science',
  term: 'Term 1',
  title: 'Living things',
  outcomes: 'Observe and compare organisms',
  grade: 'Grade 7',
  academicYear: '2026-2027',
};
it('scopes case-insensitive uniqueness by grade and year with real calendar validation', async () => {
  const h = await account();
  expect((await request(app).post('/api/v1/curriculum').set(h).send(unit)).status).toBe(201);
  expect(
    (
      await request(app)
        .post('/api/v1/curriculum')
        .set(h)
        .send({ ...unit, title: 'living things' })
    ).status,
  ).toBe(409);
  expect(
    (
      await request(app)
        .post('/api/v1/curriculum')
        .set(h)
        .send({ ...unit, grade: 'Grade 8' })
    ).status,
  ).toBe(201);
  expect(
    (
      await request(app)
        .post('/api/v1/curriculum')
        .set(h)
        .send({ ...unit, academicYear: '2027-2028' })
    ).status,
  ).toBe(201);
  expect(
    (
      await request(app)
        .post('/api/v1/curriculum')
        .set(h)
        .send({ ...unit, title: 'Bad date', plannedDate: '2026-02-30' })
    ).status,
  ).toBe(400);
  expect(
    (
      await request(app)
        .post('/api/v1/curriculum')
        .set(h)
        .send({ ...unit, title: 'Bad year', academicYear: '2026-2029' })
    ).status,
  ).toBe(400);
  const list = await request(app)
    .get('/api/v1/curriculum')
    .set(h)
    .query({ grade: 'Grade 8', academicYear: '2026-2027', archived: 'false' });
  expect(list.body.data).toHaveLength(1);
});
it('rejects stale updates and future completion; protects history through archive and restore', async () => {
  const h = await account(),
    t = await account('Teacher'),
    p = await account('Parent');
  const created = (await request(app).post('/api/v1/curriculum').set(h).send(unit)).body.data;
  expect(
    (
      await request(app)
        .patch('/api/v1/curriculum/' + created._id)
        .set(t)
        .send({ completedDate: '2099-01-01', expectedUpdatedAt: created.updatedAt, reason: 'Fictional review' })
    ).status,
  ).toBe(400);
  const done = await request(app)
    .patch('/api/v1/curriculum/' + created._id)
    .set(t)
    .send({ completedDate: '2026-01-01', expectedUpdatedAt: created.updatedAt, reason: 'Teaching completed' });
  expect(done.status).toBe(200);
  expect(done.body.data.history).toHaveLength(1);
  expect(
    (
      await request(app)
        .patch('/api/v1/curriculum/' + created._id)
        .set(t)
        .send({ title: 'Stale edit', expectedUpdatedAt: created.updatedAt, reason: 'Old planning version' })
    ).status,
  ).toBe(409);
  expect(
    (
      await request(app)
        .post('/api/v1/curriculum/' + created._id + '/archive')
        .set(t)
        .send({ archived: true, expectedUpdatedAt: done.body.data.updatedAt, reason: 'Teacher archive' })
    ).status,
  ).toBe(403);
  const archived = await request(app)
    .post('/api/v1/curriculum/' + created._id + '/archive')
    .set(h)
    .send({ archived: true, expectedUpdatedAt: done.body.data.updatedAt, reason: 'Year completed' });
  expect(archived.status).toBe(200);
  expect((await request(app).get('/api/v1/curriculum').set(p)).body.data).toHaveLength(0);
  const historyless = await request(app).get('/api/v1/curriculum?archived=true').set(p);
  expect(historyless.body.data[0].history).toHaveLength(0);
  expect(
    (
      await request(app)
        .patch('/api/v1/curriculum/' + created._id)
        .set(t)
        .send({ title: 'Archived edit', expectedUpdatedAt: archived.body.data.updatedAt, reason: 'Edit archived plan' })
    ).status,
  ).toBe(409);
  const restored = await request(app)
    .post('/api/v1/curriculum/' + created._id + '/archive')
    .set(h)
    .send({ archived: false, expectedUpdatedAt: archived.body.data.updatedAt, reason: 'Revisit teaching scope' });
  expect(restored.status).toBe(200);
  expect(restored.body.data.history).toHaveLength(3);
  const reopened = await request(app)
    .patch('/api/v1/curriculum/' + created._id)
    .set(t)
    .send({
      completedDate: null,
      plannedDate: null,
      expectedUpdatedAt: restored.body.data.updatedAt,
      reason: 'Additional teaching needed',
    });
  expect(reopened.status).toBe(200);
  expect(reopened.body.data.completedDate).toBeNull();
  expect(reopened.body.data.history).toHaveLength(4);
  expect(
    (
      await request(app)
        .delete('/api/v1/curriculum/' + created._id)
        .set(h)
    ).status,
  ).toBe(409);
});
it('migrates historical scope explicitly without deleting curriculum or guessing its year', async () => {
  await CurriculumUnit.init();
  await CurriculumUnit.collection.createIndex(
    { subject: 1, term: 1, title: 1 },
    { name: 'subject_1_term_1_title_1', unique: true, collation: { locale: 'en', strength: 2 } },
  );
  await CurriculumUnit.collection.insertOne({
    subject: 'History',
    term: 'Term 1',
    title: 'Legacy topic',
    outcomes: 'Historical outcomes',
  } as never);
  const dry = await migrateCurriculumScope();
  expect(dry.missingGrade).toBe(1);
  expect(dry.missingYear).toBe(1);
  expect(await CurriculumUnit.collection.countDocuments({ grade: { $exists: false } })).toBe(1);
  const applied = await migrateCurriculumScope(true);
  expect(applied.removedIndexes).toContain('subject_1_term_1_title_1');
  const historical = await CurriculumUnit.collection.findOne({ title: 'Legacy topic' });
  expect(historical?.grade).toBe('All grades');
  expect(historical?.academicYear).toBe('Legacy');
  const indexes = await CurriculumUnit.collection.indexes();
  expect(indexes.some((i) => i.name === 'curriculum_scope_unique')).toBe(true);
  expect(indexes.some((i) => i.name === 'subject_1_term_1_title_1')).toBe(false);
  expect(await CurriculumUnit.countDocuments()).toBe(1);
});
