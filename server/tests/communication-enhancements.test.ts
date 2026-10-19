import request from 'supertest';
import { createApp } from '../src/app';
import { Role } from '../src/types/roles';
import { User } from '../src/models/User';
const app = createApp();
async function account(role: Role, name: string) {
  const email = name + '@example.invalid';
  const r = await request(app).post('/api/v1/auth/register').send({ name, email, password: 'StrongPass123', role });
  expect(r.status).toBe(201);
  return { ...r.body.data, email };
}
const auth = (a: { accessToken: string }) => ({ Authorization: 'Bearer ' + a.accessToken });
describe('Communication production workflows', () => {
  it('persists versioned drafts, prevents stale edits and requires reviewer publication', async () => {
    const t = await account('Teacher', 'author'),
      other = await account('Teacher', 'other-author'),
      a = await account('Principal', 'reviewer'),
      p = await account('Parent', 'notice-parent');
    const r = await request(app)
      .post('/api/v1/announcements')
      .set(auth(t))
      .send({ title: 'School trip', body: 'Bring water', audience: 'Parents', status: 'Draft' });
    expect(r.status).toBe(201);
    const d = r.body.data;
    const edit = (u: { accessToken: string }, version: string) =>
      request(app)
        .patch('/api/v1/announcements/' + d._id)
        .set(auth(u))
        .send({
          title: 'School trip updated',
          body: 'Bring water and lunch',
          audience: 'Parents',
          pinned: true,
          expectedUpdatedAt: version,
        });
    expect((await edit(other, d.updatedAt)).status).toBe(409);
    const updated = await edit(t, d.updatedAt);
    expect(updated.status).toBe(200);
    expect((await edit(t, d.updatedAt)).status).toBe(409);
    expect((await request(app).get('/api/v1/announcements').set(auth(p))).body.data).toHaveLength(0);
    const transition = (u: { accessToken: string }, status: string, version?: string, reviewNote?: string) =>
      request(app)
        .patch('/api/v1/announcements/' + d._id + '/status')
        .set(auth(u))
        .send({ status, expectedUpdatedAt: version, reviewNote });
    const submitted = await transition(t, 'Pending approval', updated.body.data.updatedAt);
    expect(submitted.status).toBe(200);
    expect((await transition(t, 'Published')).status).toBe(403);
    expect((await transition(a, 'Published', updated.body.data.updatedAt)).status).toBe(409);
    const returned = await transition(a, 'Draft', submitted.body.data.updatedAt, 'Specify the trip date');
    expect(returned.body.data.reviewNote).toBe('Specify the trip date');
    const second = await transition(t, 'Pending approval', returned.body.data.updatedAt);
    expect((await transition(a, 'Published', second.body.data.updatedAt)).status).toBe(200);
    expect((await request(app).get('/api/v1/announcements').set(auth(p))).body.data).toHaveLength(1);
  });
  it('counts real active portal audience accounts with staff oversight and enforces audience visibility', async () => {
    const a = await account('Administrator', 'audience-admin'),
      p = await account('Parent', 'audience-parent'),
      s = await account('Student', 'audience-student'),
      t = await account('Teacher', 'audience-teacher'),
      inactive = await account('Parent', 'inactive-parent');
    await User.findByIdAndUpdate(inactive.user._id, { isActive: false });
    const preview = await request(app).get('/api/v1/announcements/audience-preview?audience=Parents').set(auth(a));
    expect(preview.status).toBe(200);
    expect(preview.body.data.visibleAccounts).toBe(3);
    expect(preview.body.data.deliveryTracked).toBe(false);
    expect((await request(app).get('/api/v1/announcements/audience-preview?audience=All').set(auth(p))).status).toBe(
      403,
    );
    await request(app).post('/api/v1/announcements').set(auth(a)).send({
      title: 'Parent notice',
      body: 'Parents only plus staff oversight',
      audience: 'Parents',
      status: 'Published',
    });
    expect((await request(app).get('/api/v1/announcements').set(auth(p))).body.data).toHaveLength(1);
    expect((await request(app).get('/api/v1/announcements').set(auth(s))).body.data).toHaveLength(0);
    expect((await request(app).get('/api/v1/announcements').set(auth(t))).body.data).toHaveLength(1);
  });
  it('keeps every role’s messages private and archives independently for each participant', async () => {
    const sender = await account('Parent', 'message-parent'),
      recipient = await account('Teacher', 'message-teacher'),
      stranger = await account('Administrator', 'message-admin');
    const sent = await request(app)
      .post('/api/v1/messages')
      .set(auth(sender))
      .send({ recipientEmail: recipient.email, subject: 'Attendance question', body: 'Please confirm tomorrow.' });
    expect(sent.status).toBe(201);
    const id = sent.body.data._id;
    const list = (u: { accessToken: string }, q: string) =>
      request(app)
        .get('/api/v1/messages?' + q)
        .set(auth(u));
    expect((await list(stranger, 'box=all')).body.data).toHaveLength(0);
    expect(
      (
        await request(app)
          .post('/api/v1/messages/' + id + '/archive')
          .set(auth(stranger))
          .send({ archived: true })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post('/api/v1/messages/' + id + '/archive')
          .set(auth(sender))
          .send({ archived: true })
      ).status,
    ).toBe(200);
    expect((await list(sender, 'box=sent')).body.data).toHaveLength(0);
    expect((await list(sender, 'box=all&archived=true')).body.data).toHaveLength(1);
    expect((await list(recipient, 'box=inbox')).body.data).toHaveLength(1);
    await request(app)
      .post('/api/v1/messages/' + id + '/archive')
      .set(auth(sender))
      .send({ archived: false });
    expect((await list(sender, 'box=sent')).body.data).toHaveLength(1);
  });
  it('records recipient-only read status once and validates reply participants', async () => {
    const sender = await account('Student', 'read-sender'),
      recipient = await account('Accountant', 'read-recipient'),
      stranger = await account('Principal', 'read-stranger');
    const send = (u: { accessToken: string }, body: Record<string, unknown>) =>
      request(app).post('/api/v1/messages').set(auth(u)).send(body);
    const r = await send(sender, {
        recipientEmail: recipient.email,
        subject: 'Fee receipt',
        body: 'Please share receipt',
      }),
      id = r.body.data._id;
    expect(
      (
        await request(app)
          .post('/api/v1/messages/' + id + '/read')
          .set(auth(sender))
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post('/api/v1/messages/' + id + '/read')
          .set(auth(stranger))
      ).status,
    ).toBe(404);
    const reads = await Promise.all(
      [1, 2].map(() =>
        request(app)
          .post('/api/v1/messages/' + id + '/read')
          .set(auth(recipient)),
      ),
    );
    expect(reads[0].body.data.readAt).toBe(reads[1].body.data.readAt);
    expect(
      (
        await send(recipient, {
          recipientEmail: sender.email,
          subject: 'Re: Fee receipt',
          body: 'Here is your receipt',
          replyTo: id,
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await send(recipient, {
          recipientEmail: stranger.email,
          subject: 'Leak',
          body: 'Forward without context',
          replyTo: id,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await send(stranger, {
          recipientEmail: sender.email,
          subject: 'Leak',
          body: 'Unknown conversation',
          replyTo: id,
        })
      ).status,
    ).toBe(404);
    expect((await send(sender, { recipientEmail: sender.email, subject: 'Self', body: 'Hello' })).status).toBe(400);
  });
  it('rejects inactive recipients and preserves literal HTML as message text', async () => {
    const a = await account('Administrator', 'safe-sender'),
      b = await account('Parent', 'safe-recipient');
    await User.findByIdAndUpdate(b.user._id, { isActive: false });
    const data = { recipientEmail: b.email, subject: '<img src=x>', body: '<script>alert(1)</script>' };
    expect((await request(app).post('/api/v1/messages').set(auth(a)).send(data)).status).toBe(404);
    await User.findByIdAndUpdate(b.user._id, { isActive: true });
    const sent = await request(app).post('/api/v1/messages').set(auth(a)).send(data);
    expect(sent.status).toBe(201);
    expect(sent.body.data.body).toBe(data.body);
  });
});
