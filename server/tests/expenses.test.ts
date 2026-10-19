import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Accountant' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
}

async function createStaff(token: string, refId: string, userId: string) {
  const res = await request(app)
    .post('/api/v1/staff')
    .set('Authorization', `Bearer ${token}`)
    .send({
      refId,
      name: 'Test Staff',
      designation: 'Teacher',
      department: 'Mathematics',
      type: 'Teaching',
      email: `${refId.toLowerCase()}@alnoor.ae`,
      phone: '+971502223344',
      joinedDate: '2020-08-15',
    });
  const staffId = res.body.data._id as string;
  const { Staff } = await import('../src/models/Staff');
  await Staff.findByIdAndUpdate(staffId, { userId });
  return staffId;
}

const validClaim = {
  category: 'Travel',
  amount: 250.5,
  description: 'Taxi fare for a school event',
  expenseDate: '2026-06-14',
};

describe('Expenses API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/expenses');
    expect(res.status).toBe(401);
  });

  it('rejects claim submission by a Parent - no staff link is even possible', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${parent.token}`)
      .send(validClaim);
    expect(res.status).toBe(403);
  });

  it('rejects submission by a role with no linked staff record, even one that is otherwise allowed to submit', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validClaim);
    expect(res.status).toBe(400);
  });

  it('allows a Teacher to submit their own expense claim once linked to a staff record', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    await createStaff(admin.token, 'EMP-501', teacher.userId);
    const res = await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validClaim);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Pending');
  });

  it("rejects Teacher from reviewing ANY claim, even someone else's", async () => {
    const admin = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    const submitter = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    await createStaff(admin.token, 'EMP-502', submitter.userId);
    const claim = await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${submitter.token}`)
      .send(validClaim);

    const otherTeacher = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    const res = await request(app)
      .post(`/api/v1/expenses/${claim.body.data._id}/review`)
      .set('Authorization', `Bearer ${otherTeacher.token}`)
      .send({
        status: 'Approved',
        expectedUpdatedAt: claim.body.data.updatedAt,
        reviewNotes: 'Reviewed fictional receipt',
      });
    expect(res.status).toBe(403);
  });

  it("allows an Accountant to approve someone else's claim", async () => {
    const admin = await registerAndLogin('Administrator', 'admin3@alnoor.ae');
    const submitter = await registerAndLogin('Teacher', 'teacher5@alnoor.ae');
    await createStaff(admin.token, 'EMP-503', submitter.userId);
    const claim = await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${submitter.token}`)
      .send(validClaim);

    const accountant = await registerAndLogin('Accountant', 'accountant1@alnoor.ae');
    const res = await request(app)
      .post(`/api/v1/expenses/${claim.body.data._id}/review`)
      .set('Authorization', `Bearer ${accountant.token}`)
      .send({ status: 'Approved', expectedUpdatedAt: claim.body.data.updatedAt, reviewNotes: 'Receipts verified' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Approved');
  });

  it('SELF-APPROVAL PREVENTION: an Accountant CANNOT approve their own submitted claim, even though they hold a review-capable role', async () => {
    const admin = await registerAndLogin('Administrator', 'admin4@alnoor.ae');
    const accountant = await registerAndLogin('Accountant', 'accountant2@alnoor.ae');
    await createStaff(admin.token, 'EMP-504', accountant.userId);
    const claim = await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${accountant.token}`)
      .send(validClaim);

    const res = await request(app)
      .post(`/api/v1/expenses/${claim.body.data._id}/review`)
      .set('Authorization', `Bearer ${accountant.token}`)
      .send({
        status: 'Approved',
        expectedUpdatedAt: claim.body.data.updatedAt,
        reviewNotes: 'Reviewed fictional receipt',
      });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('cannot review your own');
  });

  it('rejects reviewing an already-reviewed claim', async () => {
    const admin = await registerAndLogin('Administrator', 'admin5@alnoor.ae');
    const submitter = await registerAndLogin('Teacher', 'teacher6@alnoor.ae');
    await createStaff(admin.token, 'EMP-505', submitter.userId);
    const claim = await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${submitter.token}`)
      .send(validClaim);
    await request(app)
      .post(`/api/v1/expenses/${claim.body.data._id}/review`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        status: 'Rejected',
        expectedUpdatedAt: claim.body.data.updatedAt,
        reviewNotes: 'Rejected fictional receipt',
      });

    const res = await request(app)
      .post(`/api/v1/expenses/${claim.body.data._id}/review`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        status: 'Approved',
        expectedUpdatedAt: claim.body.data.updatedAt,
        reviewNotes: 'Reviewed fictional receipt',
      });
    expect(res.status).toBe(409);
  });

  it("a Teacher sees only their own submitted claims, not a colleague's", async () => {
    const admin = await registerAndLogin('Administrator', 'admin6@alnoor.ae');
    const teacherA = await registerAndLogin('Teacher', 'teacher7@alnoor.ae');
    const teacherB = await registerAndLogin('Teacher', 'teacher8@alnoor.ae');
    await createStaff(admin.token, 'EMP-506', teacherA.userId);
    await createStaff(admin.token, 'EMP-507', teacherB.userId);
    await request(app).post('/api/v1/expenses').set('Authorization', `Bearer ${teacherA.token}`).send(validClaim);
    await request(app).post('/api/v1/expenses').set('Authorization', `Bearer ${teacherB.token}`).send(validClaim);

    const res = await request(app).get('/api/v1/expenses').set('Authorization', `Bearer ${teacherA.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });
  it('CONCURRENCY: only one reviewer can decide a pending saved version', async () => {
    const admin = await registerAndLogin('Administrator', 'qa-concurrency@example.invalid');
    const submitter = await registerAndLogin('Teacher', 'qa-submit@example.invalid');
    await createStaff(admin.token, 'QA-CONCURRENCY', submitter.userId);
    const claim = await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${submitter.token}`)
      .send(validClaim);
    const decisions = await Promise.all(
      ['Approved', 'Rejected'].map((status) =>
        request(app)
          .post(`/api/v1/expenses/${claim.body.data._id}/review`)
          .set('Authorization', `Bearer ${admin.token}`)
          .send({ status, expectedUpdatedAt: claim.body.data.updatedAt, reviewNotes: 'Fictional receipt review' }),
      ),
    );
    expect(decisions.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(decisions.find((r) => r.status === 200)?.body.data.history).toHaveLength(1);
  });
  it('records a referenced reimbursement only once after approval', async () => {
    const admin = await registerAndLogin('Administrator', 'qa-payment@example.invalid');
    const submitter = await registerAndLogin('Teacher', 'qa-payment-submit@example.invalid');
    await createStaff(admin.token, 'QA-PAYMENT', submitter.userId);
    const claim = await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${submitter.token}`)
      .send(validClaim);
    const approved = await request(app)
      .post(`/api/v1/expenses/${claim.body.data._id}/review`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        status: 'Approved',
        expectedUpdatedAt: claim.body.data.updatedAt,
        reviewNotes: 'Fictional receipt verified',
      });
    const body = {
      expectedUpdatedAt: approved.body.data.updatedAt,
      paidDate: '2026-06-15',
      paymentMethod: 'Cash',
      paymentReference: 'QA-CASH-001',
      reason: 'Fictional reimbursement confirmed',
    };
    const paid = await request(app)
      .post(`/api/v1/expenses/${claim.body.data._id}/pay`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send(body);
    expect(paid.status).toBe(200);
    expect(paid.body.data.status).toBe('Paid');
    expect(paid.body.data.history).toHaveLength(2);
    expect(
      (
        await request(app)
          .post(`/api/v1/expenses/${claim.body.data._id}/pay`)
          .set('Authorization', `Bearer ${admin.token}`)
          .send(body)
      ).status,
    ).toBe(409);
  });
  it('allows only the submitter to cancel a pending version and rejects invalid amounts/dates', async () => {
    const admin = await registerAndLogin('Administrator', 'qa-cancel@example.invalid');
    const submitter = await registerAndLogin('Teacher', 'qa-cancel-submit@example.invalid');
    await createStaff(admin.token, 'QA-CANCEL', submitter.userId);
    const claim = await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${submitter.token}`)
      .send(validClaim);
    const path = `/api/v1/expenses/${claim.body.data._id}/cancel`,
      body = { expectedUpdatedAt: claim.body.data.updatedAt, reason: 'Duplicate receipt identified' };
    expect((await request(app).post(path).set('Authorization', `Bearer ${admin.token}`).send(body)).status).toBe(403);
    expect(
      (await request(app).post(path).set('Authorization', `Bearer ${submitter.token}`).send(body)).body.data.status,
    ).toBe('Cancelled');
    for (const invalid of [{ amount: 0.001 }, { expenseDate: '2026-02-30' }, { expenseDate: '2099-01-01' }]) {
      expect(
        (
          await request(app)
            .post('/api/v1/expenses')
            .set('Authorization', `Bearer ${submitter.token}`)
            .send({ ...validClaim, ...invalid })
        ).status,
      ).toBe(400);
    }
  });
});
