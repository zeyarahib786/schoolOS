import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Accountant' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
}

async function createStudent(token: string, refId: string, guardianUserId?: string) {
  const res = await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send({
    refId,
    name: 'Fatima Al Hashimi',
    grade: 'Grade 10 · A',
    gender: 'Female',
    roll: '12',
    guardianName: 'Khalid Al Hashimi',
    guardianUserId,
    phone: '+971501234567',
  });
  return res.body.data._id as string;
}

describe('Fees API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/fees');
    expect(res.status).toBe(401);
  });

  it('rejects invoice creation by a Teacher (fees is Administrator/Principal/Accountant only, unlike other modules)', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8001');
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ refId: 'INV-1001', studentId, term: 'Term 2', amount: 12500, dueDate: '2026-07-01' });
    expect(res.status).toBe(403);
  });

  it('allows an Accountant to raise an invoice', async () => {
    const admin = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8002');
    const accountant = await registerAndLogin('Accountant', 'accountant1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${accountant.token}`)
      .send({ refId: 'INV-1002', studentId, term: 'Term 2', amount: 12500, dueDate: '2026-07-01' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Pending');
  });

  it('rejects a duplicate invoice refId with 409', async () => {
    const admin = await registerAndLogin('Administrator', 'admin3@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8003');
    await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'INV-1003', studentId, term: 'Term 2', amount: 5000, dueDate: '2026-07-01' });
    const res = await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'INV-1003', studentId, term: 'Term 3', amount: 6000, dueDate: '2026-09-01' });
    expect(res.status).toBe(409);
  });

  it('recording a payment moves an invoice from Pending to Paid and stamps paidDate/paymentMethod', async () => {
    const admin = await registerAndLogin('Administrator', 'admin4@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8004');
    const created = await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'INV-1004', studentId, term: 'Term 2', amount: 5000, dueDate: '2026-07-01' });
    const res = await request(app)
      .post(`/api/v1/fees/${created.body.data._id}/pay`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ paymentMethod: 'Bank transfer' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Paid');
    expect(res.body.data.paidAmount).toBe(5000);
    expect(res.body.data.paymentMethod).toBe('Bank transfer');
    expect(res.body.data.paidDate).toBeDefined();
  });

  it('records partial payments in a ledger and keeps the invoice unpaid until fully collected', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-partial@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8010');
    const created = await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'INV-1010', studentId, term: 'Term 2', amount: 5000, dueDate: '2027-07-01' });

    const partial = await request(app)
      .post(`/api/v1/fees/${created.body.data._id}/pay`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ paymentMethod: 'Card', amount: 2000, reference: 'POS-1' });
    expect(partial.status).toBe(200);
    expect(partial.body.data.status).toBe('Pending');
    expect(partial.body.data.paidAmount).toBe(2000);

    const final = await request(app)
      .post(`/api/v1/fees/${created.body.data._id}/pay`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ paymentMethod: 'Cash', amount: 3000, reference: 'CASH-1' });
    expect(final.status).toBe(200);
    expect(final.body.data.status).toBe('Paid');
    expect(final.body.data.paidAmount).toBe(5000);

    const payments = await request(app)
      .get('/api/v1/fees/payments')
      .set('Authorization', `Bearer ${admin.token}`)
      .query({ invoiceId: created.body.data._id });
    expect(payments.status).toBe(200);
    expect(payments.body.data).toHaveLength(2);
  });

  it('rejects overpayments instead of corrupting balances', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-overpay@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8011');
    const created = await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'INV-1011', studentId, term: 'Term 2', amount: 1000, dueDate: '2027-07-01' });
    const res = await request(app)
      .post(`/api/v1/fees/${created.body.data._id}/pay`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ paymentMethod: 'Cash', amount: 1500 });
    expect(res.status).toBe(400);
  });

  it('records a student-level payment against the oldest unpaid invoice', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-student-pay@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8012');
    await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'INV-1012A', studentId, term: 'Term 1', amount: 1000, dueDate: '2027-04-01' });
    await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'INV-1012B', studentId, term: 'Term 2', amount: 1000, dueDate: '2027-07-01' });
    const res = await request(app)
      .post('/api/v1/fees/payments')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ studentId, amount: 1000, paymentMethod: 'Online portal', reference: 'PORTAL-1' });
    expect(res.status).toBe(200);
    expect(res.body.data.refId).toBe('INV-1012A');
    expect(res.body.data.status).toBe('Paid');
  });

  it('rejects a Teacher recording a payment', async () => {
    const admin = await registerAndLogin('Administrator', 'admin5@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8005');
    const created = await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'INV-1005', studentId, term: 'Term 2', amount: 5000, dueDate: '2026-07-01' });
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const res = await request(app)
      .post(`/api/v1/fees/${created.body.data._id}/pay`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ paymentMethod: 'Cash' });
    expect(res.status).toBe(403);
  });

  it('a Teacher sees an empty invoice list - Teacher has no fee-visibility, unlike Students/Attendance', async () => {
    const admin = await registerAndLogin('Administrator', 'admin6@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8006');
    await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'INV-1006', studentId, term: 'Term 2', amount: 5000, dueDate: '2026-07-01' });
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const res = await request(app).get('/api/v1/fees').set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it("a Parent sees only their linked child's invoices", async () => {
    const admin = await registerAndLogin('Administrator', 'admin7@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const myChildId = await createStudent(admin.token, 'ANS-8007', parent.userId);
    const otherChildId = await createStudent(admin.token, 'ANS-8008');
    await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'INV-1007', studentId: myChildId, term: 'Term 2', amount: 5000, dueDate: '2026-07-01' });
    await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'INV-1008', studentId: otherChildId, term: 'Term 2', amount: 5000, dueDate: '2026-07-01' });
    const res = await request(app).get('/api/v1/fees').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it("a Parent sees only their linked child's payment ledger entries", async () => {
    const admin = await registerAndLogin('Administrator', 'admin-ledger-parent@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent-ledger@alnoor.ae');
    const myChildId = await createStudent(admin.token, 'ANS-8013', parent.userId);
    const otherChildId = await createStudent(admin.token, 'ANS-8014');
    const mine = await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'INV-1013', studentId: myChildId, term: 'Term 2', amount: 1000, dueDate: '2026-07-01' });
    const other = await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'INV-1014', studentId: otherChildId, term: 'Term 2', amount: 1000, dueDate: '2026-07-01' });
    await request(app)
      .post(`/api/v1/fees/${mine.body.data._id}/pay`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ paymentMethod: 'Cash' });
    await request(app)
      .post(`/api/v1/fees/${other.body.data._id}/pay`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ paymentMethod: 'Cash' });
    const res = await request(app).get('/api/v1/fees/payments').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('sends fee reminders only when a linked guardian portal user exists', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-reminder@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent-reminder@alnoor.ae');
    const linkedChildId = await createStudent(admin.token, 'ANS-8015', parent.userId);
    const unlinkedChildId = await createStudent(admin.token, 'ANS-8016');
    const linked = await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'INV-1015', studentId: linkedChildId, term: 'Term 2', amount: 1000, dueDate: '2026-07-01' });
    const unlinked = await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'INV-1016', studentId: unlinkedChildId, term: 'Term 2', amount: 1000, dueDate: '2026-07-01' });
    const res = await request(app)
      .post('/api/v1/fees/reminders')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ invoiceIds: [linked.body.data._id, unlinked.body.data._id] });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ sent: 1, skipped: 1, considered: 2 });
  });

  it('rejects an invoice with a negative amount at the schema level', async () => {
    const admin = await registerAndLogin('Administrator', 'admin8@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8009');
    const res = await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'INV-1009', studentId, term: 'Term 2', amount: -100, dueDate: '2026-07-01' });
    expect(res.status).toBe(400);
  });

  it('uses the saved school currency and rejects mismatched invoice currency', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-school-currency@alnoor.ae');
    const settings = await request(app).put('/api/v1/settings').set('Authorization', `Bearer ${admin.token}`).send({
      schoolName: 'Currency Test School',
      academicYear: '2027-2028',
      timezone: 'Asia/Dubai',
      currency: 'USD',
      defaultAnnualLeave: 30,
    });
    expect(settings.status).toBe(200);
    const studentId = await createStudent(admin.token, 'ANS-CURRENCY-1');
    const body = { refId: 'INV-CURRENCY-1', studentId, term: 'Term 1', amount: 100, dueDate: '2027-12-01' };
    const created = await request(app).post('/api/v1/fees').set('Authorization', `Bearer ${admin.token}`).send(body);
    expect(created.status).toBe(201);
    expect(created.body.data.currency).toBe('USD');
    const rejected = await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ...body, refId: 'INV-CURRENCY-2', currency: 'AED' });
    expect(rejected.status).toBe(400);
  });
});
