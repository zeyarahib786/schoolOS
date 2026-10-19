import request from 'supertest';
import { createApp } from '../src/app';
const app = createApp();
async function fixture() {
  const auth = async (role: string, email: string) =>
    (
      await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Fictional ' + role, email, password: 'LocalFixture123!', role })
    ).body.data;
  const admin = await auth('Administrator', 'office@example.invalid'),
    parent = await auth('Parent', 'parent@example.invalid'),
    other = await auth('Parent', 'other@example.invalid');
  const ticket = (
    await request(app)
      .post('/api/v1/helpdesk')
      .set('Authorization', 'Bearer ' + parent.accessToken)
      .send({ category: 'IT', subject: 'QA support request', description: 'Fictional issue detail' })
  ).body.data;
  const staff = (
    await request(app)
      .post('/api/v1/staff')
      .set('Authorization', 'Bearer ' + admin.accessToken)
      .send({
        refId: 'QA-SUPPORT',
        name: 'QA support staff',
        designation: 'Support',
        department: 'IT',
        type: 'Non-Teaching',
        email: 'support@example.invalid',
        phone: '+971501234567',
        joinedDate: '2020-01-01',
      })
  ).body.data;
  return { admin, parent, other, ticket, staff };
}
describe('Owned helpdesk conversation and reviewed resolution', () => {
  it('allows owned replies but rejects unrelated access and stale reply versions', async () => {
    const f = await fixture(),
      path = '/api/v1/helpdesk/' + f.ticket._id + '/replies',
      body = { expectedUpdatedAt: f.ticket.updatedAt, message: 'QA additional issue information' };
    expect(
      (
        await request(app)
          .post(path)
          .set('Authorization', 'Bearer ' + f.other.accessToken)
          .send(body)
      ).status,
    ).toBe(404);
    const reply = await request(app)
      .post(path)
      .set('Authorization', 'Bearer ' + f.parent.accessToken)
      .send(body);
    expect(reply.status).toBe(200);
    expect(reply.body.data.replies[0].message).toBe(body.message);
    expect(
      (
        await request(app)
          .post(path)
          .set('Authorization', 'Bearer ' + f.parent.accessToken)
          .send(body)
      ).status,
    ).toBe(409);
  });
  it('records assigned/resolved/closed history, requires resolution and blocks closed replies', async () => {
    const f = await fixture(),
      path = '/api/v1/helpdesk/' + f.ticket._id + '/transition';
    const assigned = await request(app)
      .post(path)
      .set('Authorization', 'Bearer ' + f.admin.accessToken)
      .send({ status: 'Assigned', assignedTo: f.staff._id, expectedUpdatedAt: f.ticket.updatedAt });
    expect(assigned.status).toBe(200);
    expect(
      (
        await request(app)
          .post(path)
          .set('Authorization', 'Bearer ' + f.admin.accessToken)
          .send({ status: 'Resolved', expectedUpdatedAt: assigned.body.data.updatedAt })
      ).status,
    ).toBe(400);
    const resolved = await request(app)
      .post(path)
      .set('Authorization', 'Bearer ' + f.admin.accessToken)
      .send({
        status: 'Resolved',
        resolutionNotes: 'QA replacement installed and checked',
        expectedUpdatedAt: assigned.body.data.updatedAt,
      });
    expect(resolved.status).toBe(200);
    const closed = await request(app)
      .post(path)
      .set('Authorization', 'Bearer ' + f.admin.accessToken)
      .send({ status: 'Closed', expectedUpdatedAt: resolved.body.data.updatedAt });
    expect(closed.status).toBe(200);
    expect(closed.body.data.history.map((h: { to: string }) => h.to)).toEqual(['Assigned', 'Resolved', 'Closed']);
    expect(
      (
        await request(app)
          .post('/api/v1/helpdesk/' + f.ticket._id + '/replies')
          .set('Authorization', 'Bearer ' + f.parent.accessToken)
          .send({ expectedUpdatedAt: closed.body.data.updatedAt, message: 'QA late reply' })
      ).status,
    ).toBe(409);
  });
  it('unassignment clears current assignee without erasing transition history', async () => {
    const f = await fixture(),
      path = '/api/v1/helpdesk/' + f.ticket._id + '/transition';
    const assigned = await request(app)
      .post(path)
      .set('Authorization', 'Bearer ' + f.admin.accessToken)
      .send({ status: 'Assigned', assignedTo: f.staff._id });
    const reopened = await request(app)
      .post(path)
      .set('Authorization', 'Bearer ' + f.admin.accessToken)
      .send({
        status: 'Open',
        expectedUpdatedAt: assigned.body.data.updatedAt,
        resolutionNotes: 'QA routed back to queue',
      });
    expect(reopened.status).toBe(200);
    expect(reopened.body.data.assignedTo).toBeUndefined();
    expect(reopened.body.data.history).toHaveLength(2);
    expect(reopened.body.data.history[1].notes).toBe('QA routed back to queue');
  });
  it('parses default list paging and preserves ownership with status filter', async () => {
    const f = await fixture();
    const own = await request(app)
      .get('/api/v1/helpdesk?status=Open')
      .set('Authorization', 'Bearer ' + f.parent.accessToken);
    expect(own.body.meta.pagination.page).toBe(1);
    expect(own.body.data).toHaveLength(1);
    const other = await request(app)
      .get('/api/v1/helpdesk?status=Open')
      .set('Authorization', 'Bearer ' + f.other.accessToken);
    expect(other.body.data).toEqual([]);
  });
});
