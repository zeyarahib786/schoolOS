import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string, email };
}

async function send(token: string, recipientEmail: string, subject: string) {
  return request(app)
    .post('/api/v1/messages')
    .set('Authorization', `Bearer ${token}`)
    .send({ recipientEmail, subject, body: 'Message body.' });
}

describe('Messages API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/messages');
    expect(res.status).toBe(401);
  });

  it('sending to a nonexistent email is 404; sending to yourself is 400', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    expect((await send(teacher.token, 'nobody@alnoor.ae', 'Hello')).status).toBe(404);
    expect((await send(teacher.token, 'teacher1@alnoor.ae', 'Note to self')).status).toBe(400);
  });

  it('THE BIDIRECTIONAL SCOPE, PROVEN THREE WAYS: sender sees it, recipient sees it, a third party does not', async () => {
    const sender = await registerAndLogin('Teacher', 'sender@alnoor.ae');
    const recipient = await registerAndLogin('Parent', 'recipient@alnoor.ae');
    const bystander = await registerAndLogin('Parent', 'bystander@alnoor.ae');
    await send(sender.token, 'recipient@alnoor.ae', 'Progress update');

    const senderView = await request(app).get('/api/v1/messages').set('Authorization', `Bearer ${sender.token}`);
    expect(senderView.body.data.some((m: { subject: string }) => m.subject === 'Progress update')).toBe(true);

    const recipientView = await request(app).get('/api/v1/messages').set('Authorization', `Bearer ${recipient.token}`);
    expect(recipientView.body.data.some((m: { subject: string }) => m.subject === 'Progress update')).toBe(true);

    const bystanderView = await request(app).get('/api/v1/messages').set('Authorization', `Bearer ${bystander.token}`);
    expect(bystanderView.body.data.some((m: { subject: string }) => m.subject === 'Progress update')).toBe(false);
  });

  it('THE PRIVACY PROOF, A FIRST IN THIS CODEBASE: an ADMINISTRATOR cannot see correspondence they are not a party to - no administrative override exists', async () => {
    const sender = await registerAndLogin('Teacher', 'sender2@alnoor.ae');
    await registerAndLogin('Parent', 'recipient2@alnoor.ae');
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    await send(sender.token, 'recipient2@alnoor.ae', 'Private matter');

    const adminView = await request(app).get('/api/v1/messages').set('Authorization', `Bearer ${admin.token}`);
    expect(adminView.body.data.some((m: { subject: string }) => m.subject === 'Private matter')).toBe(false);
  });

  it('the inbox and sent boxes filter directionally', async () => {
    const a = await registerAndLogin('Teacher', 'boxa@alnoor.ae');
    const b = await registerAndLogin('Parent', 'boxb@alnoor.ae');
    await send(a.token, 'boxb@alnoor.ae', 'From A to B');

    const aInbox = await request(app)
      .get('/api/v1/messages')
      .set('Authorization', `Bearer ${a.token}`)
      .query({ box: 'inbox' });
    expect(aInbox.body.data.some((m: { subject: string }) => m.subject === 'From A to B')).toBe(false);
    const aSent = await request(app)
      .get('/api/v1/messages')
      .set('Authorization', `Bearer ${a.token}`)
      .query({ box: 'sent' });
    expect(aSent.body.data.some((m: { subject: string }) => m.subject === 'From A to B')).toBe(true);
    const bInbox = await request(app)
      .get('/api/v1/messages')
      .set('Authorization', `Bearer ${b.token}`)
      .query({ box: 'inbox' });
    expect(bInbox.body.data.some((m: { subject: string }) => m.subject === 'From A to B')).toBe(true);
  });

  it('ONLY the recipient can mark read: sender gets 403; a NON-PARTY Administrator gets 404 (not 403 - existence is not confirmed to non-parties)', async () => {
    const sender = await registerAndLogin('Teacher', 'sender3@alnoor.ae');
    const recipient = await registerAndLogin('Parent', 'recipient3@alnoor.ae');
    const admin = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    const sent = await send(sender.token, 'recipient3@alnoor.ae', 'Read receipt test');
    const messageId = sent.body.data._id as string;

    expect(
      (await request(app).post(`/api/v1/messages/${messageId}/read`).set('Authorization', `Bearer ${sender.token}`))
        .status,
    ).toBe(403);
    expect(
      (await request(app).post(`/api/v1/messages/${messageId}/read`).set('Authorization', `Bearer ${admin.token}`))
        .status,
    ).toBe(404);

    const marked = await request(app)
      .post(`/api/v1/messages/${messageId}/read`)
      .set('Authorization', `Bearer ${recipient.token}`);
    expect(marked.status).toBe(200);
    expect(marked.body.data.readAt).not.toBeNull();
  });
});
