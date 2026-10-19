import request from 'supertest';
import { createApp } from '../src/app';
import { AuditLog } from '../src/models/AuditLog';
const app = createApp();
async function fixture() {
  const actor = (
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'QA office', email: 'office@example.invalid', password: 'LocalFixture123!', role: 'Administrator' })
  ).body.data;
  return { auth: 'Bearer ' + actor.accessToken, id: actor.user.id || actor.user._id };
}
describe('Filtered audit register', () => {
  it('escapes action search regex and preserves exact module/severity filters', async () => {
    const f = await fixture();
    await AuditLog.create([
      { action: 'QA reviewed item [1].', module: 'Inventory', severity: 'Warning', performedBy: f.id },
      { action: 'QA reviewed item 11x', module: 'Inventory', severity: 'Info', performedBy: f.id },
    ]);
    const r = await request(app)
      .get('/api/v1/audit-log')
      .set('Authorization', f.auth)
      .query({ q: '[1].', module: 'Inventory', severity: 'Warning' });
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(1);
    expect(r.body.data[0].action).toBe('QA reviewed item [1].');
  });
  it('includes full school-day boundaries and rejects reversed or impossible dates', async () => {
    const f = await fixture();
    const a = await AuditLog.create({ action: 'QA boundary event', module: 'QA', severity: 'Info', performedBy: f.id });
    await AuditLog.collection.updateOne({ _id: a._id }, { $set: { createdAt: new Date('2026-10-10T20:00:00.000Z') } });
    const day = await request(app)
      .get('/api/v1/audit-log')
      .set('Authorization', f.auth)
      .query({ module: 'QA', dateFrom: '2026-10-11', dateTo: '2026-10-11' });
    expect(day.status).toBe(200);
    expect(day.body.data).toHaveLength(1);
    expect(
      (
        await request(app)
          .get('/api/v1/audit-log')
          .set('Authorization', f.auth)
          .query({ dateFrom: '2026-10-12', dateTo: '2026-10-11' })
      ).status,
    ).toBe(400);
    expect(
      (await request(app).get('/api/v1/audit-log').set('Authorization', f.auth).query({ dateFrom: '2026-02-30' }))
        .status,
    ).toBe(400);
  });
});
