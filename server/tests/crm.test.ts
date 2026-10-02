import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
async function register(role: 'Administrator' | 'Principal' | 'Teacher' | 'Parent', email: string) {
  const response = await request(app).post('/api/v1/auth/register')
    .send({ name: `CRM ${role}`, email, password: 'StrongPass123', role });
  return response.body.data.accessToken as string;
}
const lead = {
  name: 'CRM Test Child', grade: 'Grade 4', source: 'Website', phone: '+971 50 111 2233',
  guardian: 'CRM Guardian', guardianEmail: 'guardian@example.com', owner: 'Front Office', temperature: 'Warm',
};

describe('Enrolment CRM API', () => {
  it('requires authentication and restricts the module to its existing Administrator/Principal roles', async () => {
    expect((await request(app).get('/api/v1/crm')).status).toBe(401);
    const teacher = await register('Teacher', 'crm-teacher@alnoor.ae');
    const parent = await register('Parent', 'crm-parent@alnoor.ae');
    expect((await request(app).get('/api/v1/crm').set(auth(teacher))).status).toBe(403);
    expect((await request(app).post('/api/v1/crm').set(auth(parent)).send(lead)).status).toBe(403);
    const principal = await register('Principal', 'crm-principal@alnoor.ae');
    expect((await request(app).post('/api/v1/crm').set(auth(principal)).send(lead)).status).toBe(201);
  });

  it('creates, lists, filters, and rejects duplicate leads case-insensitively', async () => {
    const admin = await register('Administrator', 'crm-list@alnoor.ae');
    expect((await request(app).post('/api/v1/crm').set(auth(admin)).send(lead)).status).toBe(201);
    const duplicate = await request(app).post('/api/v1/crm').set(auth(admin)).send({ ...lead, name: 'crm test child' });
    expect(duplicate.status).toBe(409);
    const list = await request(app).get('/api/v1/crm').set(auth(admin)).query({ archived: 'false', search: 'Guardian' });
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].stage).toBe('New');
  });

  it('advances only one pipeline stage at a time and stops at Won', async () => {
    const admin = await register('Administrator', 'crm-stages@alnoor.ae');
    const created = await request(app).post('/api/v1/crm').set(auth(admin)).send(lead);
    let id = created.body.data._id as string;
    for (const stage of ['Contacted', 'Toured', 'Application', 'Won']) {
      const moved = await request(app).post(`/api/v1/crm/${id}/advance`).set(auth(admin));
      expect(moved.status).toBe(200);
      expect(moved.body.data.stage).toBe(stage);
    }
    expect((await request(app).post(`/api/v1/crm/${id}/advance`).set(auth(admin))).status).toBe(409);
  });

  it('persists follow-ups, activity history, and temperature changes', async () => {
    const admin = await register('Administrator', 'crm-activity@alnoor.ae');
    const created = await request(app).post('/api/v1/crm').set(auth(admin)).send(lead);
    const id = created.body.data._id;
    const follow = await request(app).put(`/api/v1/crm/${id}/follow-up`).set(auth(admin))
      .send({ date: '2026-10-01', type: 'Call', note: 'Discuss assessment' });
    expect(follow.status).toBe(200);
    expect(follow.body.data.followUpDate).toContain('2026-10-01');
    const logged = await request(app).post(`/api/v1/crm/${id}/activity`).set(auth(admin))
      .send({ type: 'Call', outcome: 'Interested', notes: 'Requested a tour', temperature: 'Hot' });
    expect(logged.status).toBe(200);
    expect(logged.body.data.temperature).toBe('Hot');
    expect(logged.body.data.activityLog[0].action).toContain('Requested a tour');
  });

  it('requires archive before permanent deletion and supports restore', async () => {
    const admin = await register('Administrator', 'crm-archive@alnoor.ae');
    const created = await request(app).post('/api/v1/crm').set(auth(admin)).send(lead);
    const id = created.body.data._id;
    expect((await request(app).delete(`/api/v1/crm/${id}`).set(auth(admin))).status).toBe(409);
    const archived = await request(app).post(`/api/v1/crm/${id}/archive`).set(auth(admin))
      .send({ reason: 'Chose another school', note: 'Confirmed by guardian' });
    expect(archived.status).toBe(200);
    expect(archived.body.data.archived).toBe(true);
    const restored = await request(app).post(`/api/v1/crm/${id}/restore`).set(auth(admin));
    expect(restored.status).toBe(200);
    expect(restored.body.data.archived).toBe(false);
    await request(app).post(`/api/v1/crm/${id}/archive`).set(auth(admin)).send({ reason: 'Duplicate' });
    expect((await request(app).delete(`/api/v1/crm/${id}`).set(auth(admin))).status).toBe(200);
    expect((await request(app).get('/api/v1/crm').set(auth(admin))).body.data).toHaveLength(0);
  });

  it('converts only an Application-stage lead into one persisted Admissions record', async () => {
    const admin = await register('Administrator', 'crm-convert@alnoor.ae');
    const created = await request(app).post('/api/v1/crm').set(auth(admin)).send(lead);
    const id = created.body.data._id;
    expect((await request(app).post(`/api/v1/crm/${id}/convert`).set(auth(admin))).status).toBe(409);
    for (let i = 0; i < 3; i += 1) await request(app).post(`/api/v1/crm/${id}/advance`).set(auth(admin));
    const converted = await request(app).post(`/api/v1/crm/${id}/convert`).set(auth(admin));
    expect(converted.status).toBe(201);
    expect(converted.body.data.lead.stage).toBe('Won');
    const applications = await request(app).get('/api/v1/admissions').set(auth(admin));
    expect(applications.body.data).toHaveLength(1);
    expect(applications.body.data[0].applicantName).toBe(lead.name);
    expect((await request(app).post(`/api/v1/crm/${id}/convert`).set(auth(admin))).status).toBe(409);
  });

  it('validates inputs and records all material changes in the immutable audit trail', async () => {
    const admin = await register('Administrator', 'crm-audit@alnoor.ae');
    expect((await request(app).post('/api/v1/crm').set(auth(admin)).send({ ...lead, grade: 'University' })).status).toBe(400);
    const created = await request(app).post('/api/v1/crm').set(auth(admin)).send(lead);
    const id = created.body.data._id;
    await request(app).post(`/api/v1/crm/${id}/activity`).set(auth(admin)).send({ type: 'Email' });
    await request(app).post(`/api/v1/crm/${id}/archive`).set(auth(admin)).send({ reason: 'Not interested' });
    const audit = await request(app).get('/api/v1/audit-log').set(auth(admin)).query({ module: 'CRM' });
    expect(audit.status).toBe(200);
    const actions = audit.body.data.map((entry: { action: string }) => entry.action);
    expect(actions).toEqual(expect.arrayContaining([
      expect.stringContaining('Created CRM lead'), expect.stringContaining('Logged CRM activity'), expect.stringContaining('Archived CRM lead'),
    ]));
  });
});
