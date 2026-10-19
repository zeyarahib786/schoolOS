import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Accountant', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
}

async function createStaff(token: string, refId: string, userId?: string) {
  const res = await request(app)
    .post('/api/v1/staff')
    .set('Authorization', `Bearer ${token}`)
    .send({
      refId,
      name: 'Rohan Mehta',
      designation: 'Teacher',
      department: 'Mathematics',
      type: 'Teaching',
      email: `${refId.toLowerCase()}@alnoor.ae`,
      phone: '+971502223344',
      joinedDate: '2020-08-15',
    });
  const staffId = res.body.data._id as string;
  if (userId) {
    const { Staff } = await import('../src/models/Staff');
    await Staff.findByIdAndUpdate(staffId, { userId });
  }
  return staffId;
}

describe('Payroll API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/payroll');
    expect(res.status).toBe(401);
  });

  it('rejects payslip generation by a Teacher', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-901');
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ staffId, month: '2026-06', basicSalary: 15000 });
    expect(res.status).toBe(403);
  });

  it('allows an Accountant to generate a payslip with computed netPay', async () => {
    const admin = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-902');
    const accountant = await registerAndLogin('Accountant', 'accountant1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${accountant.token}`)
      .send({ staffId, month: '2026-06', basicSalary: 15000, allowances: 2000, deductions: 500 });
    expect(res.status).toBe(201);
    expect(res.body.data.netPay).toBe(16500); // 15000 + 2000 - 500
    expect(res.body.data.status).toBe('Processed');
  });

  it('re-generating for the SAME (staff, month) UPDATES rather than duplicates', async () => {
    const admin = await registerAndLogin('Administrator', 'admin3@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-903');
    const created = await request(app)
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ staffId, month: '2026-06', basicSalary: 15000 });
    await request(app).post('/api/v1/payroll').set('Authorization', `Bearer ${admin.token}`).send({
      staffId,
      month: '2026-06',
      basicSalary: 16000,
      expectedUpdatedAt: created.body.data.updatedAt,
      correctionReason: 'Updated salary calculation',
    });
    const res = await request(app)
      .get('/api/v1/payroll')
      .set('Authorization', `Bearer ${admin.token}`)
      .query({ staffId, month: '2026-06' });
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].basicSalary).toBe(16000);
  });

  it('marking a payslip as paid stamps paidDate and status', async () => {
    const admin = await registerAndLogin('Administrator', 'admin4@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-904');
    const created = await request(app)
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ staffId, month: '2026-06', basicSalary: 15000 });
    const res = await request(app)
      .post(`/api/v1/payroll/${created.body.data._id}/pay`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        expectedUpdatedAt: created.body.data.updatedAt,
        paidDate: '2026-06-30',
        paymentMethod: 'Bank transfer',
        paymentReference: 'QA fictional payment',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Paid');
    expect(res.body.data.paidDate).toBeDefined();
  });

  it('rejects paying an already-paid payslip', async () => {
    const admin = await registerAndLogin('Administrator', 'admin5@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-905');
    const created = await request(app)
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ staffId, month: '2026-06', basicSalary: 15000 });
    await request(app)
      .post(`/api/v1/payroll/${created.body.data._id}/pay`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        expectedUpdatedAt: created.body.data.updatedAt,
        paidDate: '2026-06-30',
        paymentMethod: 'Bank transfer',
        paymentReference: 'QA fictional payment',
      });
    const res = await request(app)
      .post(`/api/v1/payroll/${created.body.data._id}/pay`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        expectedUpdatedAt: created.body.data.updatedAt,
        paidDate: '2026-06-30',
        paymentMethod: 'Bank transfer',
        paymentReference: 'QA fictional payment',
      });
    expect(res.status).toBe(409);
  });

  it('a Teacher sees ONLY their own linked payslips - real self-service, not a full directory', async () => {
    const admin = await registerAndLogin('Administrator', 'admin6@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const myStaffId = await createStaff(admin.token, 'EMP-906', teacher.userId);
    const colleagueStaffId = await createStaff(admin.token, 'EMP-907');
    await request(app)
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ staffId: myStaffId, month: '2026-06', basicSalary: 15000 });
    await request(app)
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ staffId: colleagueStaffId, month: '2026-06', basicSalary: 20000 });

    const res = await request(app).get('/api/v1/payroll').set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('a Teacher with NO linked staff record sees an empty list, not an error', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const res = await request(app).get('/api/v1/payroll').set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it('rejects payroll for a missing, inactive, or onboarding staff record', async () => {
    const admin = await registerAndLogin('Administrator', 'admin7@alnoor.ae');
    const missing = await request(app)
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ staffId: 'aaaaaaaaaaaaaaaaaaaaaaaa', month: '2026-06', basicSalary: 15000 });
    expect(missing.status).toBe(404);
    const staffId = await createStaff(admin.token, 'EMP-908');
    const { Staff } = await import('../src/models/Staff');
    await Staff.findByIdAndUpdate(staffId, { status: 'Inactive' });
    const inactive = await request(app)
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ staffId, month: '2026-06', basicSalary: 15000 });
    expect(inactive.status).toBe(400);
  });

  it('rejects a negative net pay and never overwrites a paid payroll period', async () => {
    const admin = await registerAndLogin('Administrator', 'admin8@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-909');
    const negative = await request(app)
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ staffId, month: '2026-06', basicSalary: 100, deductions: 101 });
    expect(negative.status).toBe(400);
    const created = await request(app)
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ staffId, month: '2026-06', basicSalary: 15000 });
    await request(app)
      .post(`/api/v1/payroll/${created.body.data._id}/pay`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        expectedUpdatedAt: created.body.data.updatedAt,
        paidDate: '2026-06-30',
        paymentMethod: 'Bank transfer',
        paymentReference: 'QA fictional payment',
      });
    const rerun = await request(app)
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ staffId, month: '2026-06', basicSalary: 16000 });
    expect(rerun.status).toBe(409);
  });

  it('concurrent payment requests allow exactly one paid transition', async () => {
    const admin = await registerAndLogin('Administrator', 'admin9@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-910');
    const created = await request(app)
      .post('/api/v1/payroll')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ staffId, month: '2026-06', basicSalary: 15000 });
    const [first, second] = await Promise.all([
      request(app)
        .post(`/api/v1/payroll/${created.body.data._id}/pay`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          expectedUpdatedAt: created.body.data.updatedAt,
          paidDate: '2026-06-30',
          paymentMethod: 'Bank transfer',
          paymentReference: 'QA fictional payment',
        }),
      request(app)
        .post(`/api/v1/payroll/${created.body.data._id}/pay`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          expectedUpdatedAt: created.body.data.updatedAt,
          paidDate: '2026-06-30',
          paymentMethod: 'Bank transfer',
          paymentReference: 'QA fictional payment',
        }),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
  });
});
