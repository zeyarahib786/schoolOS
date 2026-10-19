import request from 'supertest';
import { createApp } from '../src/app';
const app = createApp();
async function fixture() {
  const office = await request(app).post('/api/v1/auth/register').send({
    name: 'Fictional office',
    email: 'qa-office@example.invalid',
    password: 'LocalFixture123!',
    role: 'Administrator',
  });
  const parent = await request(app).post('/api/v1/auth/register').send({
    name: 'Fictional parent',
    email: 'qa-parent@example.invalid',
    password: 'LocalFixture123!',
    role: 'Parent',
  });
  const admin = office.body.data.accessToken,
    family = parent.body.data.accessToken;
  const student = await request(app)
    .post('/api/v1/students')
    .set('Authorization', 'Bearer ' + admin)
    .send({
      refId: 'QA-CERT-OWN',
      name: 'Fictional child',
      grade: 'Grade 7 · A',
      gender: 'Female',
      roll: '1',
      guardianName: 'Fictional parent',
      guardianUserId: parent.body.data.user._id,
      phone: '+971501234567',
    });
  const other = await request(app)
    .post('/api/v1/students')
    .set('Authorization', 'Bearer ' + admin)
    .send({
      refId: 'QA-CERT-OTHER',
      name: 'Fictional other child',
      grade: 'Grade 7 · B',
      gender: 'Male',
      roll: '2',
      guardianName: 'Fictional guardian',
      phone: '+971501234567',
    });
  return { admin, family, studentId: student.body.data._id, otherId: other.body.data._id };
}
describe('Owned family certificate requests', () => {
  it('rejects unrelated students and serializes duplicate pending requests', async () => {
    const f = await fixture();
    const create = (studentId: string) =>
      request(app)
        .post('/api/v1/certificates/requests')
        .set('Authorization', 'Bearer ' + f.family)
        .send({ studentId, type: 'Study', purpose: 'Fictional school file' });
    expect((await create(f.otherId)).status).toBe(403);
    const results = await Promise.all([create(f.studentId), create(f.studentId)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const visible = await request(app)
      .get('/api/v1/certificates/requests')
      .set('Authorization', 'Bearer ' + f.family);
    expect(visible.body.data).toHaveLength(1);
    expect(visible.body.data[0].status).toBe('Pending');
  });
  it('tracks own cancellation and office decisions, protects versions and intersects issued student filters', async () => {
    const f = await fixture();
    const pending = await request(app)
      .post('/api/v1/certificates/requests')
      .set('Authorization', 'Bearer ' + f.family)
      .send({ studentId: f.studentId, type: 'Bonafide', purpose: 'Fictional file' });
    const id = pending.body.data._id,
      version = pending.body.data.updatedAt;
    const cancel = await request(app)
      .post('/api/v1/certificates/' + id + '/cancel')
      .set('Authorization', 'Bearer ' + f.family)
      .send({ expectedUpdatedAt: version, reason: 'Fictional cancellation' });
    expect(cancel.body.data.status).toBe('Cancelled');
    expect(
      (
        await request(app)
          .post('/api/v1/certificates/' + id + '/decision')
          .set('Authorization', 'Bearer ' + f.admin)
          .send({ decision: 'Issued', expectedUpdatedAt: version, reason: 'Fictional office review' })
      ).status,
    ).toBe(409);
    const second = await request(app)
      .post('/api/v1/certificates/requests')
      .set('Authorization', 'Bearer ' + f.family)
      .send({ studentId: f.studentId, type: 'Study', purpose: 'Fictional file' });
    const approved = await request(app)
      .post('/api/v1/certificates/' + second.body.data._id + '/decision')
      .set('Authorization', 'Bearer ' + f.admin)
      .send({
        decision: 'Issued',
        expectedUpdatedAt: second.body.data.updatedAt,
        reason: 'Fictional office verification',
      });
    expect(approved.status).toBe(200);
    expect(approved.body.data.decisionReason).toBe('Fictional office verification');
    const filtered = await request(app)
      .get('/api/v1/certificates?studentId=' + f.otherId)
      .set('Authorization', 'Bearer ' + f.family);
    expect(filtered.body.data).toEqual([]);
    const tracked = await request(app)
      .get('/api/v1/certificates/requests')
      .set('Authorization', 'Bearer ' + f.family);
    expect(tracked.body.data.map((r: { status: string }) => r.status).sort()).toEqual(['Cancelled', 'Issued']);
  });
});
