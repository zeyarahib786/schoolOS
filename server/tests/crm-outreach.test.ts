import request from 'supertest';
import { createApp } from '../src/app';
import { CrmLead } from '../src/models/CrmLead';
import { NotificationDelivery } from '../src/models/NotificationDelivery';
import { CrmEmailBatch } from '../src/models/CrmEmailBatch';
import { processOneDelivery } from '../src/modules/notifications/notifications.service';
const app = createApp();
const originalFetch = global.fetch;
async function account(role = 'Administrator') {
  const r = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Fictional ' + role, email: role + '@example.invalid', password: 'StrongPass123', role });
  return { Authorization: 'Bearer ' + r.body.data.accessToken };
}
async function lead(auth: Record<string, string>, name: string, email = 'guardian@example.invalid') {
  const r = await request(app)
    .post('/api/v1/crm')
    .set(auth)
    .send({ name, grade: 'Grade 4', guardian: 'Fictional Guardian', guardianEmail: email });
  expect(r.status).toBe(201);
  return r.body.data;
}
afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.NOTIFICATIONS_ENABLED;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
});
function configured() {
  process.env.NOTIFICATIONS_ENABLED = 'true';
  process.env.RESEND_API_KEY = 'fictional';
  process.env.RESEND_FROM_EMAIL = 'school@example.invalid';
}
describe('CRM enquiry editing and reviewed bulk outreach', () => {
  it('persists edits, permits removing contact details, rejects stale saves and protected fields', async () => {
    const auth = await account(),
      l = await lead(auth, 'Editable Child');
    const path = '/api/v1/crm/' + l._id;
    const body = {
      name: 'Updated Child',
      grade: 'Grade 5',
      source: 'Referral',
      phone: '+971501234567',
      guardian: 'Updated Guardian',
      guardianEmail: 'updated@example.invalid',
      temperature: 'Hot',
      updatedAt: l.updatedAt,
    };
    const saved = await request(app).patch(path).set(auth).send(body);
    expect(saved.status).toBe(200);
    expect(saved.body.data.guardianEmail).toBe(body.guardianEmail);
    expect((await request(app).patch(path).set(auth).send(body)).status).toBe(409);
    expect(
      (
        await request(app)
          .patch(path)
          .set(auth)
          .send({ ...body, updatedAt: saved.body.data.updatedAt, stage: 'Won' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch(path)
          .set(auth)
          .send({ ...body, updatedAt: saved.body.data.updatedAt, guardianEmail: '', phone: '' })
      ).status,
    ).toBe(200);
    expect(
      (await CrmLead.findById(l._id))?.activityLog.filter((a) => a.action === 'Enquiry details updated'),
    ).toHaveLength(2);
    await request(app)
      .post(path + '/archive')
      .set(auth)
      .send({ reason: 'Test archive' });
    expect((await request(app).patch(path).set(auth).send(body)).status).toBe(409);
  });
  it('rejects duplicate enquiry identities without corrupting the original enquiry', async () => {
    const auth = await account(),
      a = await lead(auth, 'First Child'),
      b = await lead(auth, 'Second Child');
    const r = await request(app)
      .patch('/api/v1/crm/' + b._id)
      .set(auth)
      .send({
        name: a.name,
        phone: '',
        guardian: '',
        guardianEmail: '',
        grade: 'Grade 4',
        source: 'Website',
        temperature: 'Warm',
        updatedAt: b.updatedAt,
      });
    expect(r.status).toBe(409);
    expect((await CrmLead.findById(b._id))?.name).toBe('Second Child');
  });
  it('deduplicates real emails, skips stale contacts, safely replays batches and lists only this enquiry deliveries', async () => {
    const auth = await account(),
      a = await lead(auth, 'First Child'),
      b = await lead(auth, 'Sibling Child'),
      c = await lead(auth, 'Changed Contact', 'old@example.invalid');
    await CrmLead.updateOne({ _id: c._id }, { $set: { guardianEmail: 'new@example.invalid' } });
    configured();
    const payload = {
      recipients: [
        { id: a._id, email: a.guardianEmail },
        { id: b._id, email: b.guardianEmail },
        { id: c._id, email: c.guardianEmail },
      ],
      subject: 'Fictional update',
      body: 'Test only',
      idempotencyKey: 'batch-test-0001',
    };
    const r = await request(app).post('/api/v1/crm/bulk-email').set(auth).send(payload);
    expect(r.status).toBe(201);
    expect(r.body.data.results.filter((r: { deliveryId?: string }) => r.deliveryId)).toHaveLength(1);
    expect(r.body.data.results.filter((r: { status: string }) => r.status === 'Skipped')).toHaveLength(2);
    expect((await request(app).post('/api/v1/crm/bulk-email').set(auth).send(payload)).status).toBe(201);
    expect(await NotificationDelivery.countDocuments()).toBe(1);
    expect(await CrmEmailBatch.countDocuments()).toBe(1);
    expect(
      (
        await request(app)
          .post('/api/v1/crm/bulk-email')
          .set(auth)
          .send({ ...payload, body: 'Changed content' })
      ).status,
    ).toBe(409);
    const job = await NotificationDelivery.findOne();
    const history = await request(app)
      .get('/api/v1/crm/' + job!.crmLead + '/deliveries')
      .set(auth);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0].requestKey).toBeUndefined();
    expect(history.body.data[0].body).toBeUndefined();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'fake-provider-id' }) });
    await processOneDelivery();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((await NotificationDelivery.findOne())?.status).toBe('Accepted');
  });
  it('guards concurrent batch replays with one job per address', async () => {
    const auth = await account(),
      a = await lead(auth, 'Concurrent Child');
    configured();
    const payload = {
      recipients: [{ id: a._id, email: a.guardianEmail }],
      subject: 'Test',
      body: 'Test only',
      idempotencyKey: 'concurrent-batch-01',
    };
    const responses = await Promise.all(
      [1, 2, 3].map(() => request(app).post('/api/v1/crm/bulk-email').set(auth).send(payload)),
    );
    expect(responses.map((r) => r.status)).toEqual([201, 201, 201]);
    expect(await NotificationDelivery.countDocuments()).toBe(1);
    expect(
      (await CrmLead.findById(a._id))?.activityLog.filter((a) => a.action.startsWith('Email queued')),
    ).toHaveLength(1);
  });
  it('rejects unauthorized roles, arbitrary destinations, invalid input and unconfigured providers', async () => {
    const auth = await account(),
      a = await lead(auth, 'Protected Child'),
      parent = await account('Parent');
    const body = {
      recipients: [{ id: a._id, email: a.guardianEmail }],
      subject: 'Test',
      body: 'Test only',
      idempotencyKey: 'protected-batch-01',
    };
    expect((await request(app).post('/api/v1/crm/bulk-email').set(auth).send(body)).status).toBe(503);
    configured();
    for (const role of ['Teacher', 'Accountant', 'Parent', 'Student']) {
      const denied = role === 'Parent' ? parent : await account(role);
      expect((await request(app).post('/api/v1/crm/bulk-email').set(denied).send(body)).status).toBe(403);
      expect(
        (
          await request(app)
            .get('/api/v1/crm/' + a._id + '/deliveries')
            .set(denied)
        ).status,
      ).toBe(403);
      expect(
        (
          await request(app)
            .patch('/api/v1/crm/' + a._id)
            .set(denied)
            .send({})
        ).status,
      ).toBe(403);
    }
    expect(
      (
        await request(app)
          .post('/api/v1/crm/bulk-email')
          .set(auth)
          .send({ ...body, recipients: Array(101).fill(body.recipients[0]) })
      ).status,
    ).toBe(400);
    const r = await request(app)
      .post('/api/v1/crm/bulk-email')
      .set(auth)
      .send({ ...body, recipients: [{ id: a._id, email: 'arbitrary@example.invalid' }] });
    expect(r.body.data.results[0].status).toBe('Skipped');
    expect(await NotificationDelivery.countDocuments()).toBe(0);
  });
});
