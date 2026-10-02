import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string };
}

const validVisitor = { visitorName: 'John Smith', purpose: 'Parent-teacher meeting', hostName: 'Rohan Mehta' };

describe('Visitors API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/visitors');
    expect(res.status).toBe(401);
  });

  it('rejects a Parent from reading the visitor log at all - the ENTIRE module is staff-only, not just writes', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app).get('/api/v1/visitors').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(403);
  });

  it('rejects a Parent from checking in a visitor', async () => {
    const parent = await registerAndLogin('Parent', 'parent2@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/visitors')
      .set('Authorization', `Bearer ${parent.token}`)
      .send(validVisitor);
    expect(res.status).toBe(403);
  });

  it('allows a Teacher to check in a visitor', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/visitors')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validVisitor);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('CheckedIn');
  });

  it('checks out a visitor, stamping checkedOutAt', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const visitor = await request(app)
      .post('/api/v1/visitors')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validVisitor);
    const res = await request(app)
      .post(`/api/v1/visitors/${visitor.body.data._id}/checkout`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CheckedOut');
    expect(res.body.data.checkedOutAt).toBeDefined();
  });

  it('rejects checking out an already-checked-out visitor', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const visitor = await request(app)
      .post('/api/v1/visitors')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validVisitor);
    await request(app)
      .post(`/api/v1/visitors/${visitor.body.data._id}/checkout`)
      .set('Authorization', `Bearer ${teacher.token}`);
    const res = await request(app)
      .post(`/api/v1/visitors/${visitor.body.data._id}/checkout`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(409);
  });

  it('allows exactly one of two concurrent checkout requests to succeed', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-concurrent-checkout@alnoor.ae');
    const visitor = await request(app)
      .post('/api/v1/visitors')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validVisitor);
    const [first, second] = await Promise.all([
      request(app)
        .post(`/api/v1/visitors/${visitor.body.data._id}/checkout`)
        .set('Authorization', `Bearer ${teacher.token}`),
      request(app)
        .post(`/api/v1/visitors/${visitor.body.data._id}/checkout`)
        .set('Authorization', `Bearer ${teacher.token}`),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
  });

  it('filters by status', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    await request(app).post('/api/v1/visitors').set('Authorization', `Bearer ${teacher.token}`).send(validVisitor);
    const res = await request(app)
      .get('/api/v1/visitors')
      .set('Authorization', `Bearer ${teacher.token}`)
      .query({ status: 'CheckedIn' });
    expect(res.status).toBe(200);
    expect(res.body.data.every((v: { status: string }) => v.status === 'CheckedIn')).toBe(true);
  });
});
