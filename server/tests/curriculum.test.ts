import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return res.body.data.accessToken as string;
}

const validUnit = {
  subject: 'Mathematics',
  term: 'Term 2',
  title: 'Quadratic Equations',
  outcomes: 'Solve quadratic equations.',
};

describe('Curriculum API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/curriculum');
    expect(res.status).toBe(401);
  });

  it('rejects unit creation by a Parent (read-only role, unlike write roles)', async () => {
    const token = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app).post('/api/v1/curriculum').set('Authorization', `Bearer ${token}`).send(validUnit);
    expect(res.status).toBe(403);
  });

  it('allows a Teacher to add a curriculum unit', async () => {
    const token = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const res = await request(app).post('/api/v1/curriculum').set('Authorization', `Bearer ${token}`).send(validUnit);
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Quadratic Equations');
  });

  it('a Parent CAN read the curriculum - unlike Fees/Exams/Attendance, curriculum has no ownership restriction at all', async () => {
    const teacherToken = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    await request(app).post('/api/v1/curriculum').set('Authorization', `Bearer ${teacherToken}`).send(validUnit);
    const parentToken = await registerAndLogin('Parent', 'parent2@alnoor.ae');
    const res = await request(app).get('/api/v1/curriculum').set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('returns distinct subjects across all units', async () => {
    const token = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    await request(app).post('/api/v1/curriculum').set('Authorization', `Bearer ${token}`).send(validUnit);
    await request(app)
      .post('/api/v1/curriculum')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validUnit, subject: 'Science', title: 'Photosynthesis' });
    const res = await request(app).get('/api/v1/curriculum/subjects').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expect.arrayContaining(['Mathematics', 'Science']));
  });

  it('filters units by subject', async () => {
    const token = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    await request(app).post('/api/v1/curriculum').set('Authorization', `Bearer ${token}`).send(validUnit);
    await request(app)
      .post('/api/v1/curriculum')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validUnit, subject: 'Science', title: 'Photosynthesis' });
    const res = await request(app)
      .get('/api/v1/curriculum')
      .set('Authorization', `Bearer ${token}`)
      .query({ subject: 'Science' });
    expect(res.status).toBe(200);
    expect(res.body.data.every((u: { subject: string }) => u.subject === 'Science')).toBe(true);
  });

  it('rejects deletion by a Parent', async () => {
    const teacherToken = await registerAndLogin('Teacher', 'teacher5@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/curriculum')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(validUnit);
    const parentToken = await registerAndLogin('Parent', 'parent3@alnoor.ae');
    const res = await request(app)
      .delete(`/api/v1/curriculum/${created.body.data._id}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(403);
  });

  it('updates a unit and reflects the change', async () => {
    const token = await registerAndLogin('Teacher', 'teacher6@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/curriculum')
      .set('Authorization', `Bearer ${token}`)
      .send(validUnit);
    const res = await request(app)
      .patch(`/api/v1/curriculum/${created.body.data._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ term: 'Term 3', expectedUpdatedAt: created.body.data.updatedAt, reason: 'Reviewed term planning' });
    expect(res.status).toBe(200);
    expect(res.body.data.term).toBe('Term 3');
  });

  it('persists the retained UI planning metadata with safe defaults', async () => {
    const token = await registerAndLogin('Teacher', 'teacher7@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/curriculum')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validUnit, plannedDate: '2026-10-12', owner: 'Mathematics coordinator', framework: 'MOE 2026' });
    expect(res.status).toBe(201);
    expect(res.body.data.plannedDate).toContain('2026-10-12');
    expect(res.body.data.completedDate).toBeNull();
    expect(res.body.data.owner).toBe('Mathematics coordinator');
    expect(res.body.data.framework).toBe('MOE 2026');
  });

  it('marks coverage completed and reopens it without losing the unit', async () => {
    const token = await registerAndLogin('Teacher', 'teacher8@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/curriculum')
      .set('Authorization', `Bearer ${token}`)
      .send(validUnit);
    const completed = await request(app)
      .patch(`/api/v1/curriculum/${created.body.data._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        completedDate: '2026-09-25',
        expectedUpdatedAt: created.body.data.updatedAt,
        reason: 'Reviewed actual teaching',
      });
    expect(completed.status).toBe(200);
    expect(completed.body.data.completedDate).toContain('2026-09-25');
    const reopened = await request(app)
      .patch(`/api/v1/curriculum/${created.body.data._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        completedDate: null,
        expectedUpdatedAt: completed.body.data.updatedAt,
        reason: 'Review needs additional teaching',
      });
    expect(reopened.status).toBe(200);
    expect(reopened.body.data.completedDate).toBeNull();
  });

  it('rejects case-insensitive duplicate units in the same subject and term', async () => {
    const token = await registerAndLogin('Teacher', 'teacher9@alnoor.ae');
    expect(
      (await request(app).post('/api/v1/curriculum').set('Authorization', `Bearer ${token}`).send(validUnit)).status,
    ).toBe(201);
    const duplicate = await request(app)
      .post('/api/v1/curriculum')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validUnit, title: 'quadratic equations' });
    expect(duplicate.status).toBe(409);
  });

  it('rejects invalid planning dates', async () => {
    const token = await registerAndLogin('Teacher', 'teacher10@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/curriculum')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validUnit, plannedDate: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  it('preserves reviewed teaching history and audits archive; removes only unused units', async () => {
    const token = await registerAndLogin('Administrator', 'curriculum-admin@example.invalid');
    const headers = { Authorization: `Bearer ${token}` };
    const created = await request(app).post('/api/v1/curriculum').set(headers).send(validUnit);
    const completed = await request(app).patch(`/api/v1/curriculum/${created.body.data._id}`).set(headers).send({
      completedDate: '2026-09-25',
      expectedUpdatedAt: created.body.data.updatedAt,
      reason: 'Reviewed actual teaching',
    });
    expect(completed.status).toBe(200);
    expect((await request(app).delete(`/api/v1/curriculum/${created.body.data._id}`).set(headers)).status).toBe(409);
    expect(
      (
        await request(app).post(`/api/v1/curriculum/${created.body.data._id}/archive`).set(headers).send({
          archived: true,
          expectedUpdatedAt: completed.body.data.updatedAt,
          reason: 'Historical teaching plan',
        })
      ).status,
    ).toBe(200);
    const unused = await request(app)
      .post('/api/v1/curriculum')
      .set(headers)
      .send({ ...validUnit, title: 'Unused draft unit' });
    expect((await request(app).delete(`/api/v1/curriculum/${unused.body.data._id}`).set(headers)).status).toBe(200);
    expect((await request(app).get('/api/v1/curriculum').set(headers)).body.data).toHaveLength(0);
    const audit = await request(app).get('/api/v1/audit-log').set(headers).query({ module: 'Curriculum' });
    expect(audit.body.data.map((entry: { action: string }) => entry.action)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Added curriculum unit'),
        expect.stringContaining('Completed curriculum unit'),
        expect.stringContaining('Archived'),
        expect.stringContaining('Removed curriculum unit'),
      ]),
    );
  });
});
