import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string };
}

const validDevice = { name: 'Main Gate Scanner', location: 'Main Entrance' };

describe('Biometric API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/biometric');
    expect(res.status).toBe(401);
  });

  it('rejects a Parent from reading the device list - whole-module gate, like Visitors', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app).get('/api/v1/biometric').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(403);
  });

  it('allows a Teacher to add a device, starting Unknown', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/biometric')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validDevice);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Unknown');
    expect(res.body.data.lastSyncAt).toBeUndefined();
  });

  it('sync without a hardware connector does not fabricate status or attendance', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const device = await request(app)
      .post('/api/v1/biometric')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validDevice);
    const res = await request(app)
      .post(`/api/v1/biometric/${device.body.data._id}/sync`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(409);
    const { BiometricDevice } = await import('../src/models/BiometricDevice');
    const saved = await BiometricDevice.findById(device.body.data._id);
    expect(saved?.status).toBe('Unknown');
    expect(saved?.lastSyncAt).toBeUndefined();
  });

  it('rejects syncing a non-existent device', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/biometric/64b7f9c9a1b2c3d4e5f60789/sync')
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(404);
  });
  it('versioned manual inspection preserves history without claiming a hardware sync', async () => {
    const teacher = await registerAndLogin('Teacher', 'qa-inspection@example.invalid');
    const created = await request(app)
      .post('/api/v1/biometric')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ ...validDevice, mode: 'Card', serialNumber: 'QA-001' });
    const body = {
      ...validDevice,
      mode: 'Card',
      enabled: true,
      status: 'Online',
      observedAt: new Date(Date.now() - 1000).toISOString(),
      expectedUpdatedAt: created.body.data.updatedAt,
      reason: 'QA manual inspection',
    };
    const saved = await request(app)
      .patch('/api/v1/biometric/' + created.body.data._id)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(body);
    expect(saved.status).toBe(200);
    expect(saved.body.data.history).toHaveLength(1);
    expect(saved.body.data.lastSyncAt).toBeUndefined();
    expect(
      (
        await request(app)
          .patch('/api/v1/biometric/' + created.body.data._id)
          .set('Authorization', `Bearer ${teacher.token}`)
          .send(body)
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app)
          .patch('/api/v1/biometric/' + created.body.data._id)
          .set('Authorization', `Bearer ${teacher.token}`)
          .send({ ...body, expectedUpdatedAt: saved.body.data.updatedAt, observedAt: '2099-01-01T00:00:00.000Z' })
      ).status,
    ).toBe(400);
  });
  it('reports duplicate device names as conflicts rather than server errors', async () => {
    const teacher = await registerAndLogin('Teacher', 'qa-duplicate@example.invalid');
    for (const expected of [201, 409])
      expect(
        (await request(app).post('/api/v1/biometric').set('Authorization', `Bearer ${teacher.token}`).send(validDevice))
          .status,
      ).toBe(expected);
  });
});
