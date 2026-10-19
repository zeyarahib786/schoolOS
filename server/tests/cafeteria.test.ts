import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
}

async function createStudent(token: string, refId: string, guardianUserId?: string) {
  if (guardianUserId)
    token = (await registerAndLogin('Administrator', 'cafeteria-link-' + refId.toLowerCase() + '@example.invalid'))
      .token;
  const res = await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send({
    refId,
    name: 'Fatima Al Hashimi',
    grade: 'Grade 10 · A',
    gender: 'Female',
    roll: '12',
    guardianName: 'Khalid',
    guardianUserId,
    phone: '+971501234567',
  });
  return res.body.data._id as string;
}

describe('Cafeteria API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/cafeteria/wallets');
    expect(res.status).toBe(401);
  });

  it('rejects a top-up by a Teacher - financial data, matching Fees/Payroll role restrictions', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8501');
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/cafeteria/wallets/top-up')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId, amount: 50 });
    expect(res.status).toBe(403);
  });

  it('tops up a wallet, creating it automatically on first use', async () => {
    const admin = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8502');
    const res = await request(app)
      .post('/api/v1/cafeteria/wallets/top-up')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ studentId, amount: 100 });
    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe(100);
  });

  it('a purchase decrements the balance correctly', async () => {
    const admin = await registerAndLogin('Administrator', 'admin3@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8503');
    await request(app)
      .post('/api/v1/cafeteria/wallets/top-up')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ studentId, amount: 100 });
    const res = await request(app)
      .post('/api/v1/cafeteria/wallets/purchase')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ studentId, amount: 30, description: 'Lunch' });
    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe(70);
    const transactions = await request(app)
      .get('/api/v1/cafeteria/transactions')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(transactions.status).toBe(200);
    expect(
      transactions.body.data.some(
        (item: { type: string; description: string }) => item.type === 'Purchase' && item.description === 'Lunch',
      ),
    ).toBe(true);
  });

  it('rejects a purchase exceeding the current balance', async () => {
    const admin = await registerAndLogin('Administrator', 'admin4@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8504');
    await request(app)
      .post('/api/v1/cafeteria/wallets/top-up')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ studentId, amount: 10 });
    const res = await request(app)
      .post('/api/v1/cafeteria/wallets/purchase')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ studentId, amount: 50, description: 'Lunch' });
    expect(res.status).toBe(409);
  });

  it('CONCURRENCY: two simultaneous purchases that TOGETHER exceed the balance - exactly one succeeds, balance never goes negative', async () => {
    const admin = await registerAndLogin('Administrator', 'admin5@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8505');
    await request(app)
      .post('/api/v1/cafeteria/wallets/top-up')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ studentId, amount: 30 });

    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/v1/cafeteria/wallets/purchase')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ studentId, amount: 20, description: 'A' }),
      request(app)
        .post('/api/v1/cafeteria/wallets/purchase')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ studentId, amount: 20, description: 'B' }),
    ]);
    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]); // 30 balance can cover exactly one 20 purchase, never both

    const wallets = await request(app)
      .get('/api/v1/cafeteria/wallets')
      .set('Authorization', `Bearer ${admin.token}`)
      .query({ studentId });
    const wallet = wallets.body.data[0];
    expect(wallet.balance).toBe(10); // never negative
  });

  it("a Parent sees only their linked child's wallet", async () => {
    const admin = await registerAndLogin('Administrator', 'admin6@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const myChildId = await createStudent(admin.token, 'ANS-8506', parent.userId);
    const otherChildId = await createStudent(admin.token, 'ANS-8507');
    await request(app)
      .post('/api/v1/cafeteria/wallets/top-up')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ studentId: myChildId, amount: 50 });
    await request(app)
      .post('/api/v1/cafeteria/wallets/top-up')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ studentId: otherChildId, amount: 50 });

    const res = await request(app).get('/api/v1/cafeteria/wallets').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    const transactions = await request(app)
      .get('/api/v1/cafeteria/transactions')
      .set('Authorization', `Bearer ${parent.token}`);
    expect(transactions.status).toBe(200);
    expect(transactions.body.data.length).toBe(1);
    expect(transactions.body.data[0].wallet.student._id).toBe(myChildId);
  });

  it('persists allergy plans, updates one plan per student, and scopes parent reads', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-allergy@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent-allergy@alnoor.ae');
    const childId = await createStudent(admin.token, 'ANS-8510', parent.userId);
    const otherId = await createStudent(admin.token, 'ANS-8511');
    const first = await request(app)
      .post('/api/v1/cafeteria/allergy-plans')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        studentId: childId,
        allergens: 'Peanuts',
        severity: 'Severe',
        carePlan: 'Nut-free tray',
      });
    expect(first.status).toBe(200);
    const updated = await request(app)
      .post('/api/v1/cafeteria/allergy-plans')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        expectedUpdatedAt: first.body.data.updatedAt,
        reason: 'Reviewed dietary instructions',
        studentId: childId,
        allergens: 'Peanuts, tree nuts',
        severity: 'Severe',
        carePlan: 'Nut-free tray and EpiPen',
      });
    expect(updated.body.data._id).toBe(first.body.data._id);
    await request(app).post('/api/v1/cafeteria/allergy-plans').set('Authorization', `Bearer ${admin.token}`).send({
      studentId: otherId,
      allergens: 'Milk',
      severity: 'Moderate',
      carePlan: 'Dairy-free meal',
    });

    const visible = await request(app)
      .get('/api/v1/cafeteria/allergy-plans')
      .set('Authorization', `Bearer ${parent.token}`);
    expect(visible.status).toBe(200);
    expect(visible.body.data).toHaveLength(1);
    expect(visible.body.data[0].student._id).toBe(childId);
    expect(visible.body.data[0].allergens).toBe('Peanuts, tree nuts');
  });

  it('rejects allergy-plan writes by a Teacher', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-allergy-owner@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8512');
    const teacher = await registerAndLogin('Teacher', 'teacher-allergy@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/cafeteria/allergy-plans')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        studentId,
        allergens: 'Egg',
        severity: 'Mild',
        carePlan: 'Egg-free substitute',
      });
    expect(res.status).toBe(403);
  });

  it('upserts weekly menu meal slots without overwriting other meals', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-menu@alnoor.ae');
    const breakfast = await request(app)
      .put('/api/v1/cafeteria/menu/item')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        day: 'Sunday',
        meal: 'Breakfast',
        item: 'Shakshuka',
        calories: 390,
        vegetarian: true,
        allergens: ['Egg'],
      });
    expect(breakfast.status).toBe(200);
    const lunch = await request(app)
      .put('/api/v1/cafeteria/menu/item')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        day: 'Sunday',
        meal: 'Lunch',
        item: 'Chicken biryani',
        calories: 680,
        vegetarian: false,
        allergens: [],
      });
    expect(lunch.status).toBe(200);
    expect(lunch.body.data.breakfast.item).toBe('Shakshuka');
    expect(lunch.body.data.lunch.item).toBe('Chicken biryani');

    const menu = await request(app).get('/api/v1/cafeteria/menu').set('Authorization', `Bearer ${admin.token}`);
    expect(menu.status).toBe(200);
    expect(menu.body.data[0].day).toBe('Sunday');
  });

  it('rejects weekly menu changes by a Teacher', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-menu@alnoor.ae');
    const res = await request(app)
      .put('/api/v1/cafeteria/menu/item')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        day: 'Monday',
        meal: 'Snack',
        item: 'Fruit cup',
        calories: 120,
        vegetarian: true,
        allergens: [],
      });
    expect(res.status).toBe(403);
  });
});
