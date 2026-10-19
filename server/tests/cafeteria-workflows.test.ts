import request from 'supertest';
import { createApp } from '../src/app';
import { CafeteriaTransaction } from '../src/models/CafeteriaTransaction';
const app = createApp();
async function fixture() {
  const auth = await request(app).post('/api/v1/auth/register').send({
    name: 'Fictional office',
    email: 'cafe-office@example.invalid',
    password: 'LocalFixture123!',
    role: 'Administrator',
  });
  const token = auth.body.data.accessToken;
  const call = (path: string, body: object) =>
    request(app)
      .post('/api/v1/cafeteria/' + path)
      .set('Authorization', 'Bearer ' + token)
      .send(body);
  const student = await request(app)
    .post('/api/v1/students')
    .set('Authorization', 'Bearer ' + token)
    .send({
      refId: 'QA-CAFE',
      name: 'Fictional student',
      grade: 'Grade 7 · A',
      gender: 'Female',
      roll: '1',
      guardianName: 'Fictional guardian',
      phone: '+971501234567',
    });
  expect(student.status).toBe(201);
  return { token, call, studentId: student.body.data._id };
}
describe('Cafeteria reviewed financial workflows', () => {
  it('serializes duplicate top-ups and rejects request ID reuse with different details', async () => {
    const { call, studentId } = await fixture();
    const body = {
      studentId,
      amount: 0.1,
      requestId: 'qa-idempotent-001',
      description: 'Fictional cash receipt',
      method: 'Cash',
      reference: 'QA-1',
    };
    const responses = await Promise.all([call('wallets/top-up', body), call('wallets/top-up', body)]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    expect(await CafeteriaTransaction.countDocuments()).toBe(1);
    expect(responses[1].body.data.balance).toBe(0.1);
    expect((await call('wallets/top-up', { ...body, amount: 0.2 })).status).toBe(409);
    expect((await call('wallets/top-up', { ...body, requestId: 'qa-second-001', amount: 0.2 })).body.data.balance).toBe(
      0.3,
    );
    expect(
      (await call('wallets/purchase', { studentId, amount: 0.3, description: 'Fictional meal' })).body.data.balance,
    ).toBe(0);
    expect((await call('wallets/top-up', { studentId, amount: 0.001 })).status).toBe(400);
  });
  it('failed overspending leaves no ledger row and concurrent spending cannot overdraw', async () => {
    const { call, studentId } = await fixture();
    await call('wallets/top-up', { studentId, amount: 10 });
    const rows = await Promise.all([
      call('wallets/purchase', { studentId, amount: 7, description: 'Meal A' }),
      call('wallets/purchase', { studentId, amount: 7, description: 'Meal B' }),
    ]);
    expect(rows.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await CafeteriaTransaction.countDocuments()).toBe(2);
    expect((await CafeteriaTransaction.findOne({ type: 'Purchase' }))?.balanceAfter).toBe(3);
  });
  it('protects care-plan corrections with version checks and preserves previous instructions', async () => {
    const { call, studentId } = await fixture();
    const body = { studentId, allergens: 'Milk', severity: 'Moderate', carePlan: 'School-approved substitute' };
    const created = await call('allergy-plans', body);
    expect(created.status).toBe(200);
    expect((await call('allergy-plans', body)).status).toBe(400);
    const review = {
      ...body,
      carePlan: 'Reviewed substitute',
      expectedUpdatedAt: created.body.data.updatedAt,
      reason: 'Fictional school review',
    };
    const saved = await call('allergy-plans', review);
    expect(saved.status).toBe(200);
    expect(saved.body.data.history[0].previous.carePlan).toBe(body.carePlan);
    expect((await call('allergy-plans', review)).status).toBe(409);
  });
  it('Student reads only their own wallet, transactions and care plan, while Teacher sees no financial or medical records', async () => {
    const { token, call, studentId } = await fixture();
    const learner = await request(app).post('/api/v1/auth/register').send({
      name: 'Fictional learner',
      email: 'cafe-learner@example.invalid',
      password: 'LocalFixture123!',
      role: 'Student',
    });
    const teacher = await request(app).post('/api/v1/auth/register').send({
      name: 'Fictional teacher',
      email: 'cafe-teacher@example.invalid',
      password: 'LocalFixture123!',
      role: 'Teacher',
    });
    const linked = await request(app)
      .patch('/api/v1/students/' + studentId + '/accounts')
      .set('Authorization', 'Bearer ' + token)
      .send({ studentEmail: 'cafe-learner@example.invalid' });
    expect(linked.status).toBe(200);
    await call('wallets/top-up', { studentId, amount: 50 });
    await call('allergy-plans', {
      studentId,
      allergens: 'Milk',
      severity: 'Moderate',
      carePlan: 'Fictional substitute',
    });
    for (const path of ['wallets', 'transactions', 'allergy-plans']) {
      const own = await request(app)
        .get('/api/v1/cafeteria/' + path)
        .set('Authorization', 'Bearer ' + learner.body.data.accessToken);
      expect(own.body.data).toHaveLength(1);
      if (path === 'allergy-plans') expect(own.body.data[0].history).toEqual([]);
      const denied = await request(app)
        .get('/api/v1/cafeteria/' + path)
        .set('Authorization', 'Bearer ' + teacher.body.data.accessToken);
      expect(denied.body.data).toEqual([]);
    }
  });
});
