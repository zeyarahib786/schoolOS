import request from 'supertest';
import { createApp } from '../src/app';
import { IdCard } from '../src/models/IdCard';
const app = createApp();
async function fixture() {
  const auth = async (role: string, email: string) =>
    (
      await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Fictional ' + role, email, password: 'LocalFixture123!', role })
    ).body.data;
  const admin = await auth('Administrator', 'qa-office@example.invalid'),
    parent = await auth('Parent', 'qa-parent@example.invalid'),
    student = await auth('Student', 'qa-student@example.invalid');
  const create = async (refId: string) =>
    (
      await request(app)
        .post('/api/v1/students')
        .set('Authorization', 'Bearer ' + admin.accessToken)
        .send({
          refId,
          name: 'Fictional ' + refId,
          grade: 'Grade 7 · A',
          gender: 'Female',
          roll: '1',
          guardianName: 'Fictional guardian',
          phone: '+971501234567',
        })
    ).body.data;
  const own = await create('QA-OWN'),
    other = await create('QA-OTHER');
  expect(
    (
      await request(app)
        .patch('/api/v1/students/' + own._id + '/accounts')
        .set('Authorization', 'Bearer ' + admin.accessToken)
        .send({ parentEmail: 'qa-parent@example.invalid', studentEmail: 'qa-student@example.invalid' })
    ).status,
  ).toBe(200);
  const issue = async (subjectId: string) =>
    (
      await request(app)
        .post('/api/v1/id-cards')
        .set('Authorization', 'Bearer ' + admin.accessToken)
        .send({ subjectType: 'Student', subjectId, expiryDate: '2099-06-30' })
    ).body.data;
  return { admin, parent, student, own, other, ownCard: await issue(own._id), otherCard: await issue(other._id) };
}
describe('Owned digital ID record access', () => {
  it('scopes Parent/Student reads and PDFs and rejects unrelated lost reporting', async () => {
    const f = await fixture();
    for (const actor of [f.parent, f.student]) {
      const headers = 'Bearer ' + actor.accessToken;
      const list = await request(app).get('/api/v1/id-cards').set('Authorization', headers);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].subject.refId).toBe('QA-OWN');
      const pdf = await request(app)
        .get('/api/v1/id-cards/' + f.ownCard._id + '/pdf')
        .set('Authorization', headers);
      expect(pdf.status).toBe(200);
      expect(pdf.headers['content-type']).toContain('application/pdf');
      expect(pdf.headers['cache-control']).toBe('private, no-store');
      expect(Buffer.from(pdf.body).subarray(0, 5).toString()).toBe('%PDF-');
      expect(
        (
          await request(app)
            .get('/api/v1/id-cards/' + f.otherCard._id + '/pdf')
            .set('Authorization', headers)
        ).status,
      ).toBe(404);
      expect(
        (
          await request(app)
            .post('/api/v1/id-cards/' + f.otherCard._id + '/report-lost')
            .set('Authorization', headers)
            .send({ reason: 'Fictional lost report' })
        ).status,
      ).toBe(404);
    }
  });
  it('an owned lost report preserves history and a replacement links the previous serial', async () => {
    const f = await fixture(),
      path = '/api/v1/id-cards/' + f.ownCard._id;
    const lost = await request(app)
      .post(path + '/report-lost')
      .set('Authorization', 'Bearer ' + f.parent.accessToken)
      .send({ expectedUpdatedAt: f.ownCard.updatedAt, reason: 'Fictional card misplaced' });
    expect(lost.status).toBe(200);
    expect(lost.body.data.history[0].reason).toBe('Fictional card misplaced');
    const replacement = await request(app)
      .post('/api/v1/id-cards')
      .set('Authorization', 'Bearer ' + f.admin.accessToken)
      .send({ subjectType: 'Student', subjectId: f.own._id, expiryDate: '2099-06-30' });
    expect(replacement.status).toBe(201);
    expect(replacement.body.data.replaces).toBe(f.ownCard._id);
  });
  it('expiry filtering derives validity without silently changing saved lifecycle state', async () => {
    const f = await fixture();
    await IdCard.findByIdAndUpdate(f.ownCard._id, { expiryDate: new Date('2000-01-01') });
    const expired = await request(app)
      .get('/api/v1/id-cards?status=Expired')
      .set('Authorization', 'Bearer ' + f.parent.accessToken);
    expect(expired.body.data).toHaveLength(1);
    expect(expired.body.data[0].status).toBe('Active');
    const active = await request(app)
      .get('/api/v1/id-cards?status=Active')
      .set('Authorization', 'Bearer ' + f.parent.accessToken);
    expect(active.body.data).toEqual([]);
  });
});
