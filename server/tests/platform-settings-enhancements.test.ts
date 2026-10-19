import request from 'supertest';
import { createApp } from '../src/app';
import { AccessRole } from '../src/models/AccessRole';
const app = createApp();
async function fixture() {
  const actor = (
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'QA office', email: 'office@example.invalid', password: 'LocalFixture123!', role: 'Administrator' })
  ).body.data;
  return 'Bearer ' + actor.accessToken;
}
describe('Versioned platform configuration', () => {
  it('read-only role hydration preserves saved permission versions', async () => {
    const auth = await fixture();
    const first = (await request(app).get('/api/v1/roles').set('Authorization', auth)).body.data.roles;
    const second = (await request(app).get('/api/v1/roles').set('Authorization', auth)).body.data.roles;
    expect(second.map((r: { updatedAt: string }) => r.updatedAt)).toEqual(
      first.map((r: { updatedAt: string }) => r.updatedAt),
    );
  });
  it('rejects stale school settings revisions and preserves the saved configuration', async () => {
    const auth = await fixture(),
      initial = (await request(app).get('/api/v1/settings').set('Authorization', auth)).body.data;
    const body = { ...initial, expectedRevision: 0, schoolName: 'QA fictional school' };
    const saved = await request(app).put('/api/v1/settings').set('Authorization', auth).send(body);
    expect(saved.status).toBe(200);
    expect(saved.body.data.revision).toBe(1);
    expect(
      (
        await request(app)
          .put('/api/v1/settings')
          .set('Authorization', auth)
          .send({ ...body, schoolName: 'QA stale overwrite' })
      ).status,
    ).toBe(409);
    expect((await request(app).get('/api/v1/settings').set('Authorization', auth)).body.data.schoolName).toBe(
      'QA fictional school',
    );
  });
  it('preserves existing visibility decisions while adding missing module keys', async () => {
    const auth = await fixture();
    await request(app).get('/api/v1/roles').set('Authorization', auth);
    const role = await AccessRole.findOne({ name: 'Teacher' });
    await AccessRole.updateOne(
      { _id: role!._id },
      { $set: { 'permissions.Attendance': false }, $unset: { 'permissions.Helpdesk': 1 } },
    );
    const refreshed = await request(app).get('/api/v1/roles').set('Authorization', auth);
    const teacher = refreshed.body.data.roles.find((r: { name: string }) => r.name === 'Teacher');
    expect(teacher.permissions.Attendance).toBe(false);
    expect(teacher.permissions.Helpdesk).toBe(true);
    expect(Object.keys(teacher.permissions)).toHaveLength(37);
  });
  it('preserves permission history and prevents stale update or Administrator recovery lockout', async () => {
    const auth = await fixture(),
      listed = (await request(app).get('/api/v1/roles').set('Authorization', auth)).body.data;
    const teacher = listed.roles.find((r: { name: string }) => r.name === 'Teacher'),
      admin = listed.roles.find((r: { name: string }) => r.name === 'Administrator');
    const body = { enabled: false, expectedUpdatedAt: teacher.updatedAt, reason: 'QA permission visibility review' };
    const path = '/api/v1/roles/' + teacher._id + '/permissions/Helpdesk';
    const saved = await request(app).patch(path).set('Authorization', auth).send(body);
    expect(saved.status).toBe(200);
    expect(saved.body.data.history[0].reason).toBe(body.reason);
    expect(
      (
        await request(app)
          .patch(path)
          .set('Authorization', auth)
          .send({ ...body, enabled: true })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app)
          .patch('/api/v1/roles/' + admin._id + '/permissions/Settings')
          .set('Authorization', auth)
          .send({ enabled: false })
      ).status,
    ).toBe(409);
  });
});
