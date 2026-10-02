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

  it('allows a Teacher to add a device, starting Offline', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/biometric')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validDevice);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Offline');
    expect(res.body.data.lastSyncAt).toBeUndefined();
  });

  it('syncing a device marks it Online and stamps lastSyncAt', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const device = await request(app)
      .post('/api/v1/biometric')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validDevice);
    const res = await request(app)
      .post(`/api/v1/biometric/${device.body.data._id}/sync`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Online');
    expect(res.body.data.lastSyncAt).toBeDefined();
  });

  it('rejects syncing a non-existent device', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/biometric/64b7f9c9a1b2c3d4e5f60789/sync')
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(404);
  });
});
