import request from 'supertest';
import { Webhook } from 'svix';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { NotificationDelivery, NotificationEvent } from '../src/models/NotificationDelivery';
import { processOneDelivery } from '../src/modules/notifications/notifications.service';
import { Role } from '../src/types/roles';
const app = createApp();
async function account(role: Role, name: string) {
  const r = await request(app)
    .post('/api/v1/auth/register')
    .send({ name, email: name + '@example.invalid', password: 'StrongPass123', role });
  expect(r.status).toBe(201);
  return { ...r.body.data, email: name + '@example.invalid' };
}
const auth = (u: { accessToken: string }) => ({ Authorization: 'Bearer ' + u.accessToken });
const originalFetch = global.fetch;
beforeEach(() => {
  process.env.NOTIFICATIONS_ENABLED = 'true';
  process.env.RESEND_API_KEY = 'fictional-local-test-key';
  process.env.RESEND_FROM_EMAIL = 'qa@example.invalid';
  process.env.RESEND_WEBHOOK_SECRET = 'whsec_' + Buffer.from('fictional-webhook-key-32-bytes-only').toString('base64');
  process.env.SMS_PROVIDER = 'disabled';
});
afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.NOTIFICATIONS_ENABLED;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  delete process.env.RESEND_WEBHOOK_SECRET;
  delete process.env.SMS_PROVIDER;
});
describe('External notification queue', () => {
  it('requires configuration and denies external sends by families or Accountant', async () => {
    const a = await account('Principal', 'disabled'),
      p = await account('Parent', 'disabled-recipient');
    process.env.NOTIFICATIONS_ENABLED = 'false';
    const body = {
      recipientEmail: p.email,
      channel: 'Email',
      subject: 'School update',
      body: 'QA only',
      idempotencyKey: 'local-request-1',
    };
    expect((await request(app).post('/api/v1/notifications').set(auth(a)).send(body)).status).toBe(503);
    expect((await request(app).post('/api/v1/notifications').set(auth(p)).send(body)).status).toBe(403);
    expect(await NotificationDelivery.countDocuments()).toBe(0);
  });
  it('queues idempotently, holds Teacher drafts for approval and sends once with Resend idempotency', async () => {
    const t = await account('Teacher', 'queue-teacher'),
      a = await account('Principal', 'queue-reviewer'),
      p = await account('Parent', 'queue-parent');
    const body = {
      recipientEmail: p.email,
      channel: 'Email',
      subject: 'School update',
      body: 'QA only',
      idempotencyKey: 'local-request-2',
    };
    const queue = () => request(app).post('/api/v1/notifications').set(auth(t)).send(body);
    const first = await queue();
    expect(first.status).toBe(201);
    expect(first.body.data.status).toBe('Awaiting approval');
    expect((await queue()).body.data._id).toBe(first.body.data._id);
    expect(
      (
        await request(app)
          .post('/api/v1/notifications')
          .set(auth(t))
          .send({ ...body, body: 'Different' })
      ).status,
    ).toBe(409);
    expect(await processOneDelivery()).toBe(false);
    expect(
      (
        await request(app)
          .post('/api/v1/notifications/' + first.body.data._id + '/approve')
          .set(auth(t))
      ).status,
    ).toBe(403);
    await request(app)
      .post('/api/v1/notifications/' + first.body.data._id + '/approve')
      .set(auth(a));
    const send = jest.fn(async () => new Response(JSON.stringify({ id: 'provider-qa-1' }), { status: 200 }));
    global.fetch = send;
    await Promise.all([processOneDelivery(), processOneDelivery()]);
    expect(send).toHaveBeenCalledTimes(1);
    expect((send.mock.calls[0] as unknown[])[1]).toMatchObject({
      headers: expect.objectContaining({ 'Idempotency-Key': 'schoolos-' + first.body.data._id }),
    });
    expect((await NotificationDelivery.findById(first.body.data._id))?.status).toBe('Accepted');
  });
  it('does not send to an account deactivated after queuing and protects sender-owned delivery records', async () => {
    const a = await account('Principal', 'privacy-admin'),
      t = await account('Teacher', 'privacy-teacher'),
      p = await account('Parent', 'privacy-parent');
    const r = await request(app).post('/api/v1/notifications').set(auth(a)).send({
      recipientEmail: p.email,
      channel: 'Email',
      subject: 'QA',
      body: 'QA',
      idempotencyKey: 'local-request-3',
    });
    await User.findByIdAndUpdate(p.user._id, { isActive: false });
    const send = jest.fn();
    global.fetch = send;
    await processOneDelivery();
    expect(send).not.toHaveBeenCalled();
    expect((await NotificationDelivery.findById(r.body.data._id))?.errorCode).toBe('RECIPIENT_UNAVAILABLE');
    expect((await request(app).get('/api/v1/notifications').set(auth(t))).body.data).toHaveLength(0);
    expect(
      (
        await request(app)
          .post('/api/v1/notifications/' + r.body.data._id + '/retry')
          .set(auth(t))
      ).status,
    ).toBe(404);
  });
  it('records uncertain outcomes and prevents resend outside the provider window', async () => {
    const a = await account('Administrator', 'unknown-admin'),
      p = await account('Parent', 'unknown-parent');
    const r = await request(app).post('/api/v1/notifications').set(auth(a)).send({
      recipientEmail: p.email,
      channel: 'Email',
      subject: 'QA',
      body: 'QA',
      idempotencyKey: 'local-request-4',
    });
    global.fetch = jest.fn(async () => {
      throw Error('Network timeout');
    });
    await processOneDelivery();
    expect((await NotificationDelivery.findById(r.body.data._id))?.status).toBe('Unknown');
    await NotificationDelivery.findByIdAndUpdate(r.body.data._id, {
      firstAttemptAt: new Date(Date.now() - 24 * 3600000),
    });
    expect(
      (
        await request(app)
          .post('/api/v1/notifications/' + r.body.data._id + '/retry')
          .set(auth(a))
      ).status,
    ).toBe(409);
  });
  it('verifies webhook signatures, deduplicates callbacks and preserves terminal failures over late delivery events', async () => {
    const a = await account('Principal', 'events-admin'),
      p = await account('Parent', 'events-parent');
    const r = await request(app).post('/api/v1/notifications').set(auth(a)).send({
      recipientEmail: p.email,
      channel: 'Email',
      subject: 'QA',
      body: 'QA',
      idempotencyKey: 'local-request-5',
    });
    global.fetch = jest.fn(async () => new Response(JSON.stringify({ id: 'provider-qa-event' }), { status: 200 }));
    await processOneDelivery();
    const webhook = async (type: string, id: string) => {
      const payload = JSON.stringify({
          type,
          created_at: new Date().toISOString(),
          data: { email_id: 'provider-qa-event' },
        }),
        timestamp = new Date();
      const signature = new Webhook(process.env.RESEND_WEBHOOK_SECRET!).sign(id, timestamp, payload);
      return request(app)
        .post('/api/v1/notifications/resend-webhook')
        .set({
          'Content-Type': 'application/json',
          'svix-id': id,
          'svix-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
          'svix-signature': signature,
        })
        .send(payload);
    };
    expect(
      (
        await request(app)
          .post('/api/v1/notifications/resend-webhook')
          .set('Content-Type', 'application/json')
          .send({ type: 'email.delivered' })
      ).status,
    ).toBe(401);
    expect((await webhook('email.delivered', 'event-1')).status).toBe(200);
    await webhook('email.delivered', 'event-1');
    expect(await NotificationEvent.countDocuments()).toBe(1);
    expect((await NotificationDelivery.findById(r.body.data._id))?.status).toBe('Delivered');
    await webhook('email.bounced', 'event-2');
    await webhook('email.delivered', 'event-3');
    expect((await NotificationDelivery.findById(r.body.data._id))?.status).toBe('Bounced');
  });
});
