import request from 'supertest';
import { createApp } from '../src/app';
import { AccessRole } from '../src/models/AccessRole';
import { AuditLog } from '../src/models/AuditLog';

const app = createApp();

async function account(role: 'Administrator' | 'Principal', email: string) {
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Roles ${role}`, email, password: 'StrongPass123', role });
  return response.body.data.accessToken as string;
}

describe('Roles & Access API', () => {
  it('requires authentication and restricts administration to Administrator', async () => {
    expect((await request(app).get('/api/v1/roles')).status).toBe(401);
    const principal = await account('Principal', 'roles-principal@alnoor.ae');
    expect((await request(app).get('/api/v1/roles').set('Authorization', `Bearer ${principal}`)).status).toBe(403);
    expect((await request(app).get('/api/v1/roles/me').set('Authorization', `Bearer ${principal}`)).status).toBe(200);
  });

  it('initializes and returns the established six-role, full released-module matrix with real user totals', async () => {
    const admin = await account('Administrator', 'roles-admin@alnoor.ae');
    const response = await request(app).get('/api/v1/roles').set('Authorization', `Bearer ${admin}`);
    expect(response.status).toBe(200);
    expect(response.body.data.roles).toHaveLength(6);
    expect(response.body.data.modules).toHaveLength(37);
    expect(response.body.data.modules).toEqual(
      expect.arrayContaining(['Hostel', 'Documents', 'ID Cards', 'Helpdesk', 'Surveys & Feedback']),
    );
    expect(response.body.data.totalUsers).toBe(1);
    expect(
      response.body.data.roles.find((role: { name: string }) => role.name === 'Administrator').permissions.Settings,
    ).toBe(true);
  });

  it('persists a permission toggle and records the security change in the audit log', async () => {
    const admin = await account('Administrator', 'roles-toggle@alnoor.ae');
    const listed = await request(app).get('/api/v1/roles').set('Authorization', `Bearer ${admin}`);
    const teacher = listed.body.data.roles.find((role: { name: string }) => role.name === 'Teacher');
    const updated = await request(app)
      .patch(`/api/v1/roles/${teacher._id}/permissions/${encodeURIComponent('Fees & Finance')}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ enabled: true });
    expect(updated.status).toBe(200);
    expect(updated.body.data.permissions['Fees & Finance']).toBe(true);
    expect((await AccessRole.findById(teacher._id))?.permissions.get('Fees & Finance')).toBe(true);
    expect(await AuditLog.countDocuments({ module: 'Roles & Access', severity: 'Warning' })).toBe(1);
  });

  it('creates a persisted custom role by cloning its selected base role', async () => {
    const admin = await account('Administrator', 'roles-create@alnoor.ae');
    const response = await request(app)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${admin}`)
      .send({ name: 'Librarian', basedOn: 'Teacher', description: 'Library operations' });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ name: 'Librarian', basedOn: 'Teacher', isSystem: false });
    expect(response.body.data.permissions.Students).toBe(true);
    expect(response.body.data.permissions.Payroll).toBe(false);
    expect(await AccessRole.countDocuments({})).toBe(7);
  });

  it('rejects duplicate names, unknown base roles, malformed ids and unsupported modules', async () => {
    const admin = await account('Administrator', 'roles-invalid@alnoor.ae');
    await request(app).get('/api/v1/roles').set('Authorization', `Bearer ${admin}`);
    expect(
      (
        await request(app)
          .post('/api/v1/roles')
          .set('Authorization', `Bearer ${admin}`)
          .send({ name: 'Teacher', basedOn: 'Teacher' })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app)
          .post('/api/v1/roles')
          .set('Authorization', `Bearer ${admin}`)
          .send({ name: 'New Role', basedOn: 'Missing' })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .patch('/api/v1/roles/not-an-id/permissions/Students')
          .set('Authorization', `Bearer ${admin}`)
          .send({ enabled: true })
      ).status,
    ).toBe(400);
    const role = await AccessRole.findOne({ key: 'teacher' });
    expect(
      (
        await request(app)
          .patch(`/api/v1/roles/${role?._id}/permissions/Unknown`)
          .set('Authorization', `Bearer ${admin}`)
          .send({ enabled: true })
      ).status,
    ).toBe(400);
  });
});
