import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string };
}

const validVisitor = {
  hostConfirmed: true,
  visitorName: 'John Smith',
  purpose: 'Parent-teacher meeting',
  hostName: 'Rohan Mehta',
};

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
  it('requires confirmed host approval and protects active badge uniqueness until departure', async () => {
    const teacher = await registerAndLogin('Teacher', 'qa-visitor-badge@example.invalid');
    const create = (body: object) =>
      request(app).post('/api/v1/visitors').set('Authorization', `Bearer ${teacher.token}`).send(body);
    expect((await create({ ...validVisitor, hostConfirmed: false })).status).toBe(400);
    const one = await create({ ...validVisitor, badge: 'QA-001', identityChecked: true, phone: '+971501234567' });
    expect(one.status).toBe(201);
    expect((await create({ ...validVisitor, badge: 'QA-001' })).status).toBe(409);
    const out = await request(app)
      .post('/api/v1/visitors/' + one.body.data._id + '/checkout')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ expectedUpdatedAt: one.body.data.updatedAt, reason: 'QA badge returned' });
    expect(out.status).toBe(200);
    expect(out.body.data.history).toHaveLength(1);
    expect(out.body.data.checkedOutBy).toBeDefined();
    expect((await create({ ...validVisitor, badge: 'QA-001' })).status).toBe(201);
  });
  it('versioned corrections preserve previous details and stale checkout cannot close the corrected entry', async () => {
    const teacher = await registerAndLogin('Teacher', 'qa-visitor-review@example.invalid');
    const created = await request(app)
      .post('/api/v1/visitors')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validVisitor);
    const body = {
      visitorName: 'QA corrected guest',
      hostName: validVisitor.hostName,
      purpose: validVisitor.purpose,
      phone: '',
      organization: 'QA organization',
      notes: 'QA desk note',
      expectedUpdatedAt: created.body.data.updatedAt,
      reason: 'QA corrected spelling',
    };
    const path = '/api/v1/visitors/' + created.body.data._id;
    const saved = await request(app).patch(path).set('Authorization', `Bearer ${teacher.token}`).send(body);
    expect(saved.status).toBe(200);
    expect(saved.body.data.history[0].previous.visitorName).toBe(validVisitor.visitorName);
    expect(
      (
        await request(app)
          .patch(path)
          .set('Authorization', `Bearer ${teacher.token}`)
          .send({ ...body, hostName: 'QA different host', expectedUpdatedAt: saved.body.data.updatedAt })
      ).status,
    ).toBe(400);
    expect((await request(app).patch(path).set('Authorization', `Bearer ${teacher.token}`).send(body)).status).toBe(
      409,
    );
    expect(
      (
        await request(app)
          .post(path + '/checkout')
          .set('Authorization', `Bearer ${teacher.token}`)
          .send({ expectedUpdatedAt: created.body.data.updatedAt, reason: 'QA stale departure' })
      ).status,
    ).toBe(409);
    const { VisitorLog } = await import('../src/models/VisitorLog');
    expect((await VisitorLog.findById(created.body.data._id))?.status).toBe('CheckedIn');
  });
});
