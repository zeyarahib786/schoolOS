import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
}

async function createStudent(token: string, refId: string, guardianUserId?: string) {
  const res = await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send({
    refId,
    name: 'Fatima Al Hashimi',
    grade: 'Grade 10 · A',
    gender: 'Female',
    roll: '12',
    guardianName: 'Khalid',
    guardianUserId,
    phone: '+971501234567',
  });
  return res.body.data._id as string;
}

describe('Behaviour API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/behaviour');
    expect(res.status).toBe(401);
  });

  it('rejects logging by a Parent', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-2001');
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/behaviour')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ studentId, category: 'Disruption', description: 'x' });
    expect(res.status).toBe(403);
  });

  it('allows a Teacher to log an incident', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-2002');
    const res = await request(app)
      .post('/api/v1/behaviour')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId, category: 'Disruption', description: 'Interrupted class.', severity: 'Moderate' });
    expect(res.status).toBe(201);
    expect(res.body.data.severity).toBe('Moderate');
  });

  it('a Parent sees only incidents for their linked child', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent2@alnoor.ae');
    const myChildId = await createStudent(teacher.token, 'ANS-2003', parent.userId);
    const otherChildId = await createStudent(teacher.token, 'ANS-2004');
    await request(app)
      .post('/api/v1/behaviour')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId: myChildId, category: 'X', description: 'x' });
    await request(app)
      .post('/api/v1/behaviour')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId: otherChildId, category: 'X', description: 'x' });

    const res = await request(app).get('/api/v1/behaviour').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('filters by severity', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-2005');
    await request(app)
      .post('/api/v1/behaviour')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId, category: 'X', description: 'x', severity: 'Serious' });
    const res = await request(app)
      .get('/api/v1/behaviour')
      .set('Authorization', `Bearer ${teacher.token}`)
      .query({ severity: 'Serious' });
    expect(res.status).toBe(200);
    expect(res.body.data.every((i: { severity: string }) => i.severity === 'Serious')).toBe(true);
  });

  it('preserves UI behaviour fields and persists escalation/closure', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-behaviour-workflow@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-2010');
    const created = await request(app).post('/api/v1/behaviour').set('Authorization', `Bearer ${teacher.token}`).send({
      studentId, category: 'Incident', description: 'Repeated disruption', severity: 'Serious',
      type: 'Incident', points: -5, location: 'Room 4B', witness: 'Class teacher',
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ type: 'Incident', points: -5, location: 'Room 4B', status: 'Logged' });
    const id = created.body.data._id as string;

    const escalated = await request(app).patch(`/api/v1/behaviour/${id}/status`).set('Authorization', `Bearer ${teacher.token}`).send({ status: 'Escalated' });
    expect(escalated.status).toBe(200);
    expect(escalated.body.data.status).toBe('Escalated');

    const closed = await request(app).patch(`/api/v1/behaviour/${id}/status`).set('Authorization', `Bearer ${teacher.token}`).send({ status: 'Closed' });
    expect(closed.status).toBe(200);
    expect(closed.body.data.status).toBe('Closed');
  });
});
