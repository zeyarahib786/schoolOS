import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string };
}

describe('Audit Log API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/audit-log');
    expect(res.status).toBe(401);
  });

  it('rejects a Teacher from reading the audit log - Administrator/Principal only', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const res = await request(app).get('/api/v1/audit-log').set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(403);
  });

  it('allows an Administrator to read the audit log', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const res = await request(app).get('/api/v1/audit-log').set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.pagination).toMatchObject({ page: 1, limit: 20 });
  });

  it('APPEND-ONLY: no arbitrary create, update, or delete route exists for audit entries', async () => {
    const admin = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    const createAttempt = await request(app)
      .post('/api/v1/audit-log')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ action: 'Fabricated entry', module: 'Fake' });
    expect(createAttempt.status).toBe(404); // no route exists, not a 403 - the endpoint itself is absent

    const updateAttempt = await request(app)
      .patch('/api/v1/audit-log/64b7f9c9a1b2c3d4e5f60789')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ action: 'Tampered' });
    expect(updateAttempt.status).toBe(404);

    const deleteAttempt = await request(app)
      .delete('/api/v1/audit-log/64b7f9c9a1b2c3d4e5f60789')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(deleteAttempt.status).toBe(404);
  });

  it('REAL CROSS-MODULE USAGE: a successful login genuinely creates a findable audit log entry, not a theoretical unused code path', async () => {
    const email = 'realuser@alnoor.ae';
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Real User', email, password: 'StrongPass123', role: 'Administrator' });
    await request(app).post('/api/v1/auth/login').send({ email, password: 'StrongPass123' });

    const admin = await registerAndLogin('Administrator', 'admin3@alnoor.ae');
    const res = await request(app)
      .get('/api/v1/audit-log')
      .set('Authorization', `Bearer ${admin.token}`)
      .query({ module: 'Auth' });
    expect(res.status).toBe(200);
    expect(
      res.body.data.some((e: { action: string }) => e.action.includes(email) && e.action.includes('logged in')),
    ).toBe(true);
  });

  it('a failed login attempt creates a Warning-severity entry, distinct from a successful Info-level login', async () => {
    const email = 'wrongpassuser@alnoor.ae';
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Test User', email, password: 'StrongPass123', role: 'Administrator' });
    await request(app).post('/api/v1/auth/login').send({ email, password: 'WrongPassword1' });

    const admin = await registerAndLogin('Administrator', 'admin4@alnoor.ae');
    const res = await request(app)
      .get('/api/v1/audit-log')
      .set('Authorization', `Bearer ${admin.token}`)
      .query({ severity: 'Warning' });
    expect(res.status).toBe(200);
    expect(
      res.body.data.some((e: { action: string }) => e.action.includes('Failed login') && e.action.includes(email)),
    ).toBe(true);
  });

  it('logout genuinely creates an audit log entry too', async () => {
    const email = 'logouttest@alnoor.ae';
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Logout Test', email, password: 'StrongPass123', role: 'Administrator' });
    await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${reg.body.data.accessToken}`);

    const admin = await registerAndLogin('Administrator', 'admin5@alnoor.ae');
    const res = await request(app).get('/api/v1/audit-log').set('Authorization', `Bearer ${admin.token}`);
    expect(res.body.data.some((e: { action: string }) => e.action === 'User logged out')).toBe(true);
  });

  it('filters by module correctly', async () => {
    const admin = await registerAndLogin('Administrator', 'admin6@alnoor.ae');
    const res = await request(app)
      .get('/api/v1/audit-log')
      .set('Authorization', `Bearer ${admin.token}`)
      .query({ module: 'Auth' });
    expect(res.status).toBe(200);
    expect(res.body.data.every((e: { module: string }) => e.module === 'Auth')).toBe(true);
  });

  it('paginates the complete ordered trail and returns server severity', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-pagination@alnoor.ae');
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${admin.token}`);
    const { AuditLog } = await import('../src/models/AuditLog');
    await AuditLog.insertMany(Array.from({ length: 105 }, (_, index) => ({
      action: `Pagination event ${index}`, module: 'Audit Test',
      performedBy: me.body.data.user._id, severity: index === 104 ? 'Critical' : 'Info',
    })));
    const first = await request(app).get('/api/v1/audit-log').set('Authorization', `Bearer ${admin.token}`)
      .query({ page: 1, limit: 100, module: 'Audit Test' });
    const second = await request(app).get('/api/v1/audit-log').set('Authorization', `Bearer ${admin.token}`)
      .query({ page: 2, limit: 100, module: 'Audit Test' });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.meta.pagination).toMatchObject({ page: 1, limit: 100, total: 105, totalPages: 2 });
    expect(second.body.data).toHaveLength(5);
    expect(new Set([...first.body.data, ...second.body.data].map((row: { _id: string }) => row._id)).size).toBe(105);
    expect([...first.body.data, ...second.body.data].some((row: { severity: string }) => row.severity === 'Critical')).toBe(true);
  });

  it('records an audit export with server-authored text and rejects fabricated payloads', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-export@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher-export@alnoor.ae');
    const forbidden = await request(app).post('/api/v1/audit-log/exports')
      .set('Authorization', `Bearer ${teacher.token}`).send({});
    expect(forbidden.status).toBe(403);
    const fabricated = await request(app).post('/api/v1/audit-log/exports')
      .set('Authorization', `Bearer ${admin.token}`).send({ action: 'Fake export' });
    expect(fabricated.status).toBe(400);
    const exported = await request(app).post('/api/v1/audit-log/exports')
      .set('Authorization', `Bearer ${admin.token}`).send({});
    expect(exported.status).toBe(200);
    const audit = await request(app).get('/api/v1/audit-log')
      .set('Authorization', `Bearer ${admin.token}`).query({ module: 'Audit', severity: 'Warning' });
    expect(audit.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ action: 'Exported audit log', severity: 'Warning' })]));
  });
});
