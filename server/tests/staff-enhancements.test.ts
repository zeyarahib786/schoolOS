import request from 'supertest';
import { createApp } from '../src/app';
import { Staff } from '../src/models/Staff';
import { LeaveRequest } from '../src/models/LeaveRequest';
import { Payslip } from '../src/models/Payslip';
import { Role } from '../src/types/roles';
const app = createApp();
async function user(role: Role, name: string) {
  const r = await request(app)
    .post('/api/v1/auth/register')
    .send({ name, email: name + '@example.invalid', password: 'StrongPass123', role });
  expect(r.status).toBe(201);
  return r.body.data;
}
const auth = (u: { accessToken: string }) => ({ Authorization: 'Bearer ' + u.accessToken });
const profile = (ref = 'HR-QA', email = 'hr-teacher@example.invalid') => ({
  refId: ref,
  email,
  name: 'QA HR Employee',
  designation: 'Teacher',
  department: 'Mathematics',
  type: 'Teaching',
  phone: '+971501234567',
  joinedDate: '2020-01-01',
  annualLeaveRemaining: 10,
});
async function fixture() {
  const office = await user('Principal', 'hr-office'),
    teacher = await user('Teacher', 'hr-teacher'),
    parent = await user('Parent', 'hr-parent');
  const made = await request(app).post('/api/v1/staff').set(auth(office)).send(profile());
  expect(made.status).toBe(201);
  return { office, teacher, parent, staff: made.body.data };
}
describe('Staff, leave and payroll real-life refinements', () => {
  it('protects staff-role account linking, stale profile edits and profile history', async () => {
    const f = await fixture();
    const changed = await request(app)
      .patch('/api/v1/staff/' + f.staff._id)
      .set(auth(f.office))
      .send({
        department: 'Science',
        annualLeaveRemaining: 12,
        expectedUpdatedAt: f.staff.updatedAt,
        changeReason: 'Corrected staff allocation',
      });
    expect(changed.status).toBe(200);
    expect(changed.body.data.profileHistory).toHaveLength(1);
    expect(changed.body.data.profileHistory[0]).toMatchObject({ previousLeaveBalance: 10, leaveBalance: 12 });
    expect(
      (
        await request(app)
          .patch('/api/v1/staff/' + f.staff._id)
          .set(auth(f.office))
          .send({ name: 'Stale name', expectedUpdatedAt: f.staff.updatedAt, changeReason: 'Stale attempt' })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app)
          .patch('/api/v1/staff/' + f.staff._id + '/account')
          .set(auth(f.office))
          .send({
            email: 'hr-parent@example.invalid',
            expectedUpdatedAt: changed.body.data.updatedAt,
            reason: 'Rejected family role',
          })
      ).status,
    ).toBe(400);
    const other = await request(app)
      .post('/api/v1/staff')
      .set(auth(f.office))
      .send(profile('HR-OTHER', 'unlinked@example.invalid'));
    expect(
      (
        await request(app)
          .patch('/api/v1/staff/' + other.body.data._id + '/account')
          .set(auth(f.office))
          .send({
            email: 'hr-teacher@example.invalid',
            expectedUpdatedAt: other.body.data.updatedAt,
            reason: 'Duplicate account attempt',
          })
      ).status,
    ).toBe(409);
  });
  it('keeps private HR documents out of payroll directory and permits own document download', async () => {
    const f = await fixture(),
      accountant = await user('Accountant', 'hr-accountant');
    expect(
      (
        await request(app)
          .put('/api/v1/staff/' + f.staff._id + '/documents/id')
          .set(auth(f.office))
          .set('Content-Type', 'application/pdf')
          .set('X-File-Name', 'fictional-id.pdf')
          .send(Buffer.from('%PDF-test'))
      ).status,
    ).toBe(201);
    const rows = await request(app).get('/api/v1/staff').set(auth(accountant));
    expect(rows.body.data[0].documents).toHaveLength(0);
    expect(
      (
        await request(app)
          .get('/api/v1/staff/' + f.staff._id + '/documents/id')
          .set(auth(accountant))
      ).status,
    ).toBe(404);
    const own = await request(app)
      .get('/api/v1/staff/' + f.staff._id + '/documents/id')
      .set(auth(f.teacher));
    expect(own.status).toBe(200);
    expect(own.headers['cache-control']).toBe('private, no-store');
    expect((await request(app).get('/api/v1/staff').set(auth(f.parent))).body.data).toHaveLength(0);
  });
  it('rejects family-role automatic links even when an employee email matches', async () => {
    const f = await fixture();
    const familyStaff = await request(app)
      .post('/api/v1/staff')
      .set(auth(f.office))
      .send(profile('HR-FAMILY', 'hr-parent@example.invalid'));
    expect(familyStaff.status).toBe(201);
    expect(familyStaff.body.data.userId).toBeUndefined();
    expect(
      (
        await request(app).post('/api/v1/leave').set(auth(f.parent)).send({
          staffId: familyStaff.body.data._id,
          fromDate: '2026-11-01',
          toDate: '2026-11-01',
          reason: 'Unauthorized',
        })
      ).status,
    ).toBe(403);
  });
  it('serializes overlapping submissions and deducts simultaneous approval exactly once', async () => {
    const f = await fixture();
    const body = { fromDate: '2026-11-01', toDate: '2026-11-03', reason: 'Fictional annual leave' };
    const submissions = await Promise.all([
      request(app).post('/api/v1/leave').set(auth(f.teacher)).send(body),
      request(app).post('/api/v1/leave').set(auth(f.teacher)).send(body),
    ]);
    expect(submissions.map((r) => r.status).sort()).toEqual([201, 409]);
    const id = submissions.find((r) => r.status === 201)!.body.data._id;
    const decisions = await Promise.all([
      request(app)
        .post('/api/v1/leave/' + id + '/decide')
        .set(auth(f.office))
        .send({ decision: 'Approved' }),
      request(app)
        .post('/api/v1/leave/' + id + '/decide')
        .set(auth(f.office))
        .send({ decision: 'Approved' }),
    ]);
    expect(decisions.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await Staff.findById(f.staff._id))?.annualLeaveRemaining).toBe(7);
    expect((await LeaveRequest.findById(id))?.status).toBe('Approved');
  });
  it('cancels approved annual leave with a single refund and keeps sick leave separate', async () => {
    const f = await fixture();
    const made = await request(app)
      .post('/api/v1/leave')
      .set(auth(f.teacher))
      .send({ fromDate: '2026-11-01', toDate: '2026-11-02', reason: 'Fictional leave' });
    const id = made.body.data._id;
    await request(app)
      .post('/api/v1/leave/' + id + '/decide')
      .set(auth(f.office))
      .send({ decision: 'Approved' });
    expect(
      (
        await request(app)
          .post('/api/v1/leave/' + id + '/cancel')
          .set(auth(f.teacher))
          .send({ reason: 'Cannot self-refund approved leave' })
      ).status,
    ).toBe(403);
    const result = await Promise.all([
      request(app)
        .post('/api/v1/leave/' + id + '/cancel')
        .set(auth(f.office))
        .send({ reason: 'Recorded cancellation' }),
      request(app)
        .post('/api/v1/leave/' + id + '/cancel')
        .set(auth(f.office))
        .send({ reason: 'Duplicate cancellation' }),
    ]);
    expect(result.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await Staff.findById(f.staff._id))?.annualLeaveRemaining).toBe(10);
    const sick = await request(app)
      .post('/api/v1/leave')
      .set(auth(f.teacher))
      .send({ type: 'Sick leave', fromDate: '2026-11-01', toDate: '2026-11-02', reason: 'Fictional sick leave' });
    expect(sick.status).toBe(201);
    expect(
      (
        await request(app)
          .post('/api/v1/leave/' + sick.body.data._id + '/decide')
          .set(auth(f.office))
          .send({ decision: 'Approved' })
      ).status,
    ).toBe(200);
    expect((await Staff.findById(f.staff._id))?.annualLeaveRemaining).toBe(10);
  });
  it('uses exact cents, validates real months and protects corrections/payments with versions', async () => {
    const f = await fixture();
    expect(
      (
        await request(app)
          .post('/api/v1/payroll')
          .set(auth(f.office))
          .send({ staffId: f.staff._id, month: '2026-13', basicSalary: 100 })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/v1/payroll')
          .set(auth(f.office))
          .send({ staffId: f.staff._id, month: '2026-10', basicSalary: 100.001 })
      ).status,
    ).toBe(400);
    const made = await request(app)
      .post('/api/v1/payroll')
      .set(auth(f.office))
      .send({ staffId: f.staff._id, month: '2026-10', basicSalary: 100.1, allowances: 0.2, deductions: 0.1 });
    expect(made.status).toBe(201);
    expect(made.body.data.netPay).toBe(100.2);
    const corrected = await request(app).post('/api/v1/payroll').set(auth(f.office)).send({
      staffId: f.staff._id,
      month: '2026-10',
      basicSalary: 100.2,
      expectedUpdatedAt: made.body.data.updatedAt,
      correctionReason: 'Corrected saved basic amount',
    });
    expect(corrected.status).toBe(201);
    expect(corrected.body.data.corrections).toHaveLength(1);
    expect(
      (
        await request(app).post('/api/v1/payroll').set(auth(f.office)).send({
          staffId: f.staff._id,
          month: '2026-11',
          basicSalary: 200,
          expectedUpdatedAt: made.body.data.updatedAt,
          correctionReason: 'Changed period attempt',
        })
      ).status,
    ).toBe(409);
    const payment = {
      paidDate: '2026-10-01',
      paymentMethod: 'Bank transfer',
      paymentReference: 'QA-EXTERNAL-NO-TRANSFER',
      expectedUpdatedAt: corrected.body.data.updatedAt,
    };
    const paid = await request(app)
      .post('/api/v1/payroll/' + made.body.data._id + '/pay')
      .set(auth(f.office))
      .send(payment);
    expect(paid.status).toBe(200);
    expect(paid.body.data).toMatchObject({ status: 'Paid', paymentReference: payment.paymentReference });
    expect(
      (
        await request(app).post('/api/v1/payroll').set(auth(f.office)).send({
          staffId: f.staff._id,
          month: '2026-10',
          basicSalary: 500,
          expectedUpdatedAt: paid.body.data.updatedAt,
          correctionReason: 'Cannot change paid period',
        })
      ).status,
    ).toBe(409);
    expect(await Payslip.countDocuments()).toBe(1);
  });
  it('produces actual own payslip PDFs and denies another employee or family download', async () => {
    const f = await fixture(),
      other = await user('Teacher', 'hr-other-teacher');
    const made = await request(app)
      .post('/api/v1/payroll')
      .set(auth(f.office))
      .send({ staffId: f.staff._id, month: '2026-10', basicSalary: 100 });
    const id = made.body.data._id;
    const pdf = await request(app)
      .get('/api/v1/payroll/' + id + '/pdf')
      .set(auth(f.teacher));
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    for (const u of [other, f.parent])
      expect(
        (
          await request(app)
            .get('/api/v1/payroll/' + id + '/pdf')
            .set(auth(u))
        ).status,
      ).toBe(404);
  });
});
