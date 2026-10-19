import { SNSClient } from '@aws-sdk/client-sns';
import { Staff } from '../src/models/Staff';
import request from 'supertest';
import { createApp } from '../src/app';
import { InboxNotification } from '../src/models/InboxNotification';
import { CrmLead } from '../src/models/CrmLead';
import { NotificationDelivery } from '../src/models/NotificationDelivery';
import { notifyDueFollowUps } from '../src/modules/notifications/notifications.inbox.service';
import { processOneDelivery } from '../src/modules/notifications/notifications.service';
import { Role } from '../src/types/roles';
const app = createApp();
async function account(role: Role, name: string) {
  const r = await request(app)
    .post('/api/v1/auth/register')
    .send({ name, email: name + '@example.invalid', password: 'StrongPass123', role });
  expect(r.status).toBe(201);
  return r.body.data;
}
const auth = (u: { accessToken: string }) => ({ Authorization: 'Bearer ' + u.accessToken });
const input = {
  name: 'Fictional CRM Child',
  grade: 'Grade 4',
  phone: '+971501234567',
  guardianEmail: 'prospect@example.invalid',
};
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
  delete process.env.SMS_PROVIDER;
  delete process.env.SMS_AWS_REGION;
  delete process.env.NOTIFICATIONS_ENABLED;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
});
describe('Saved inbox and CRM integration', () => {
  it('notifies private-message recipients without exposing message content to other users', async () => {
    const a = await account('Administrator', 'message-office'),
      p = await account('Parent', 'message-parent'),
      other = await account('Teacher', 'message-other');
    const sent = await request(app).post('/api/v1/messages').set(auth(a)).send({
      recipientEmail: 'message-parent@example.invalid',
      subject: 'Fictional school update',
      body: 'Private test text',
    });
    expect(sent.status).toBe(201);
    const inbox = await request(app).get('/api/v1/inbox').set(auth(p));
    expect(inbox.body.data[0].recordId).toBe(sent.body.data._id);
    expect(inbox.body.data[0].body).not.toContain('Private test text');
    expect((await request(app).get('/api/v1/inbox').set(auth(other))).body.data).toHaveLength(0);
  });
  it('persists notifications, scopes all reads and prevents cross-account read changes', async () => {
    const a = await account('Administrator', 'inbox-office'),
      p = await account('Parent', 'inbox-parent');
    const lead = await request(app).post('/api/v1/crm').set(auth(a)).send(input);
    expect(lead.status).toBe(201);
    const inbox = await request(app).get('/api/v1/inbox').set(auth(a));
    expect(inbox.body.meta.unread).toBe(1);
    const id = inbox.body.data[0]._id;
    expect((await request(app).get('/api/v1/inbox').set(auth(p))).body.data).toHaveLength(0);
    expect(
      (
        await request(app)
          .post('/api/v1/inbox/' + id + '/read')
          .set(auth(p))
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post('/api/v1/inbox/' + id + '/read')
          .set(auth(a))
      ).status,
    ).toBe(200);
    expect((await request(app).get('/api/v1/inbox').set(auth(a))).body.meta.unread).toBe(0);
    expect(await InboxNotification.countDocuments()).toBe(1);
  });
  it('assigns only CRM-enabled active accounts, routes due reminders and completes follow-ups without duplicates', async () => {
    const a = await account('Administrator', 'assign-admin'),
      o = await account('Principal', 'assign-owner'),
      t = await account('Teacher', 'assign-teacher');
    const lead = (await request(app).post('/api/v1/crm').set(auth(a)).send(input)).body.data;
    expect(
      (
        await request(app)
          .post('/api/v1/crm/' + lead._id + '/assign')
          .set(auth(a))
          .send({ ownerId: t.user._id })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/v1/crm/' + lead._id + '/assign')
          .set(auth(a))
          .send({ ownerId: o.user._id })
      ).status,
    ).toBe(200);
    await request(app)
      .put('/api/v1/crm/' + lead._id + '/follow-up')
      .set(auth(a))
      .send({ date: '2020-01-01', type: 'Campus tour' });
    await notifyDueFollowUps();
    await notifyDueFollowUps();
    expect(await InboxNotification.countDocuments({ recipient: o.user._id, title: 'CRM follow-up due' })).toBe(1);
    expect(
      (
        await request(app)
          .post('/api/v1/crm/' + lead._id + '/complete-follow-up')
          .set(auth(a))
          .send({ note: 'Family contacted' })
      ).status,
    ).toBe(200);
    expect((await CrmLead.findById(lead._id))?.followUpDate).toBeUndefined();
    await request(app).post('/api/v1/inbox/read-all').set(auth(o));
    expect((await request(app).get('/api/v1/inbox?unread=true').set(auth(o))).body.data).toHaveLength(0);
    expect((await request(app).get('/api/v1/crm/assignees').set(auth(t))).status).toBe(403);
  });
  it('paginates inbox history and never accepts an arbitrary recipient', async () => {
    const a = await account('Principal', 'history-admin'),
      p = await account('Parent', 'history-parent');
    await InboxNotification.insertMany(
      Array.from({ length: 28 }, (_, i) => ({
        recipient: a.user._id,
        eventKey: 'event-' + i,
        title: 'CRM lead assigned',
        body: 'Fictional child',
        module: 'crm',
        recordId: a.user._id,
      })),
    );
    const first = await request(app).get('/api/v1/inbox').set(auth(a));
    expect(first.body.data).toHaveLength(25);
    expect(first.body.meta.pagination.total).toBe(28);
    expect((await request(app).get('/api/v1/inbox?page=2').set(auth(a))).body.data).toHaveLength(3);
    expect(
      (
        await request(app)
          .get('/api/v1/inbox?recipient=' + a.user._id)
          .set(auth(p))
      ).body.data,
    ).toHaveLength(0);
  });
  it('queues an authorized SMS and records SNS acceptance using a mocked provider', async () => {
    const a = await account('Administrator', 'sns-office'),
      recipient = await account('Accountant', 'sns-recipient');
    await Staff.create({
      refId: 'QA-SNS',
      name: 'Fictional SMS Recipient',
      designation: 'Accountant',
      department: 'Finance',
      type: 'Non-Teaching',
      email: 'sns-recipient@example.invalid',
      phone: '+971501234567',
      joinedDate: new Date('2020-01-01'),
      userId: recipient.user._id,
    });
    process.env.NOTIFICATIONS_ENABLED = 'true';
    process.env.SMS_PROVIDER = 'aws-sns';
    process.env.SMS_AWS_REGION = 'us-east-1';
    const provider = jest
      .spyOn(SNSClient.prototype, 'send')
      .mockResolvedValue({ MessageId: 'fictional-sns-id' } as never);
    const queued = await request(app)
      .post('/api/v1/notifications')
      .set(auth(a))
      .send({
        recipientEmail: 'sns-recipient@example.invalid',
        channel: 'SMS',
        subject: 'Fictional school reminder',
        body: 'Test only',
        idempotencyKey: 'sns-local-request',
      });
    expect(queued.status).toBe(201);
    await processOneDelivery();
    expect(provider).toHaveBeenCalledTimes(1);
    expect((await NotificationDelivery.findById(queued.body.data._id))?.status).toBe('Accepted');
  });
  it('queues prospect Resend email idempotently without requiring a portal account and validates contact again at delivery', async () => {
    const a = await account('Administrator', 'email-office');
    const lead = (await request(app).post('/api/v1/crm').set(auth(a)).send(input)).body.data;
    const path = '/api/v1/crm/' + lead._id + '/email',
      body = { subject: 'Tour confirmation', body: 'Fictional test only', idempotencyKey: 'fictional-email-1' };
    expect((await request(app).post(path).set(auth(a)).send(body)).status).toBe(503);
    process.env.NOTIFICATIONS_ENABLED = 'true';
    process.env.RESEND_API_KEY = 'fictional-key';
    process.env.RESEND_FROM_EMAIL = 'school@example.invalid';
    expect((await request(app).post(path).set(auth(a)).send(body)).status).toBe(201);
    expect((await request(app).post(path).set(auth(a)).send(body)).status).toBe(201);
    expect(await NotificationDelivery.countDocuments()).toBe(1);
    expect(
      (
        await request(app)
          .post(path)
          .set(auth(a))
          .send({ ...body, body: 'Different content' })
      ).status,
    ).toBe(409);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'fictional-resend-id' }) });
    await processOneDelivery();
    expect((await NotificationDelivery.findOne())?.status).toBe('Accepted');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await request(app)
      .post(path)
      .set(auth(a))
      .send({ ...body, idempotencyKey: 'fictional-email-2' });
    await CrmLead.updateOne({ _id: lead._id }, { $set: { guardianEmail: 'changed@example.invalid' } });
    await processOneDelivery();
    expect(await NotificationDelivery.countDocuments({ errorCode: 'RECIPIENT_CONTACT_CHANGED' })).toBe(1);
  });
});
