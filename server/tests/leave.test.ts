import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Principal' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
}

async function createStaff(token: string, refId: string, userId?: string, annualLeaveRemaining?: number) {
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
  if (userId !== undefined || annualLeaveRemaining !== undefined) {
    const { Staff } = await import('../src/models/Staff');
    await Staff.findByIdAndUpdate(staffId, {
      ...(userId !== undefined ? { userId } : {}),
      ...(annualLeaveRemaining !== undefined ? { annualLeaveRemaining } : {}),
    });
  }
  return staffId;
}

async function requestLeave(token: string, fromDate: string, toDate: string) {
  return request(app)
    .post('/api/v1/leave')
    .set('Authorization', `Bearer ${token}`)
    .send({ fromDate, toDate, reason: 'Family travel' });
}

describe('Leave API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/leave');
    expect(res.status).toBe(401);
  });

  it('rejects a leave request from a non-staff role', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await requestLeave(parent.token, '2026-07-06', '2026-07-08');
    expect(res.status).toBe(403);
  });

  it('a linked Teacher requests leave; the stored day count is the INCLUSIVE calendar count', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    await createStaff(admin.token, 'EMP-801', teacher.userId);
    const res = await requestLeave(teacher.token, '2026-07-06', '2026-07-08');
    expect(res.status).toBe(201);
    expect(res.body.data.days).toBe(3);
    expect(res.body.data.status).toBe('Pending');
  });

  it('rejects an inverted date range with a clear validation error', async () => {
    const admin = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    await createStaff(admin.token, 'EMP-802', teacher.userId);
    const res = await requestLeave(teacher.token, '2026-07-08', '2026-07-06');
    expect(res.status).toBe(400);
  });

  it('a Teacher cannot decide ANY leave request - approval is Administrator/Principal only', async () => {
    const admin = await registerAndLogin('Administrator', 'admin3@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    await createStaff(admin.token, 'EMP-803', teacher.userId);
    const leave = await requestLeave(teacher.token, '2026-07-06', '2026-07-07');
    const res = await request(app)
      .post(`/api/v1/leave/${leave.body.data._id}/decide`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ decision: 'Approved' });
    expect(res.status).toBe(403);
  });

  it('approval deducts the day count from the staff member leave balance', async () => {
    const admin = await registerAndLogin('Administrator', 'admin4@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-804', teacher.userId, 10);
    const leave = await requestLeave(teacher.token, '2026-07-06', '2026-07-08'); // 3 days
    const res = await request(app)
      .post(`/api/v1/leave/${leave.body.data._id}/decide`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ decision: 'Approved' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Approved');

    const staffRes = await request(app).get(`/api/v1/staff/${staffId}`).set('Authorization', `Bearer ${admin.token}`);
    expect(staffRes.body.data.annualLeaveRemaining).toBe(7);
  });

  it('a denial does NOT touch the balance', async () => {
    const admin = await registerAndLogin('Administrator', 'admin5@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher5@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-805', teacher.userId, 10);
    const leave = await requestLeave(teacher.token, '2026-07-06', '2026-07-08');
    await request(app)
      .post(`/api/v1/leave/${leave.body.data._id}/decide`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ decision: 'Denied' });
    const staffRes = await request(app).get(`/api/v1/staff/${staffId}`).set('Authorization', `Bearer ${admin.token}`);
    expect(staffRes.body.data.annualLeaveRemaining).toBe(10);
  });

  it('approving a leave larger than the remaining balance gets a real 400, and the request stays Pending', async () => {
    const admin = await registerAndLogin('Administrator', 'admin6@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher6@alnoor.ae');
    await createStaff(admin.token, 'EMP-806', teacher.userId, 2);
    const leave = await requestLeave(teacher.token, '2026-07-06', '2026-07-10'); // 5 days > 2 remaining
    const res = await request(app)
      .post(`/api/v1/leave/${leave.body.data._id}/decide`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ decision: 'Approved' });
    expect(res.status).toBe(400);

    const check = await request(app)
      .get('/api/v1/leave')
      .set('Authorization', `Bearer ${admin.token}`)
      .query({ status: 'Pending' });
    expect(check.body.data.some((l: { _id: string }) => l._id === leave.body.data._id)).toBe(true);
  });

  it('SELF-APPROVAL PREVENTION: a Principal with their own linked staff record cannot decide their own request - not even to deny it', async () => {
    const admin = await registerAndLogin('Administrator', 'admin7@alnoor.ae');
    const principal = await registerAndLogin('Principal', 'principal1@alnoor.ae');
    await createStaff(admin.token, 'EMP-807', principal.userId);
    const leave = await requestLeave(principal.token, '2026-07-06', '2026-07-07');
    for (const decision of ['Approved', 'Denied']) {
      const res = await request(app)
        .post(`/api/v1/leave/${leave.body.data._id}/decide`)
        .set('Authorization', `Bearer ${principal.token}`)
        .send({ decision });
      expect(res.status).toBe(403);
    }
    // another approver CAN decide it
    const res = await request(app)
      .post(`/api/v1/leave/${leave.body.data._id}/decide`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ decision: 'Approved' });
    expect(res.status).toBe(200);
  });

  it('an already-decided request cannot be decided again (409), and the balance is not double-deducted', async () => {
    const admin = await registerAndLogin('Administrator', 'admin8@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher8@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-808', teacher.userId, 10);
    const leave = await requestLeave(teacher.token, '2026-07-06', '2026-07-07'); // 2 days
    await request(app)
      .post(`/api/v1/leave/${leave.body.data._id}/decide`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ decision: 'Approved' });
    const second = await request(app)
      .post(`/api/v1/leave/${leave.body.data._id}/decide`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ decision: 'Approved' });
    expect(second.status).toBe(409);
    const staffRes = await request(app).get(`/api/v1/staff/${staffId}`).set('Authorization', `Bearer ${admin.token}`);
    expect(staffRes.body.data.annualLeaveRemaining).toBe(8); // deducted exactly once
  });

  it('THE CONCURRENCY GUARD, PROVEN: two simultaneous approvals for the same staff member cannot jointly overdraw the balance', async () => {
    const admin = await registerAndLogin('Administrator', 'admin9@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher9@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-809', teacher.userId, 4);
    const leaveA = await requestLeave(teacher.token, '2026-07-06', '2026-07-08'); // 3 days
    const leaveB = await requestLeave(teacher.token, '2026-08-03', '2026-08-05'); // 3 days - only one can fit in a 4-day balance

    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/v1/leave/${leaveA.body.data._id}/decide`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ decision: 'Approved' }),
      request(app)
        .post(`/api/v1/leave/${leaveB.body.data._id}/decide`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ decision: 'Approved' }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 400]); // exactly one approval landed, the other found the guard unsatisfied

    const staffRes = await request(app).get(`/api/v1/staff/${staffId}`).set('Authorization', `Bearer ${admin.token}`);
    expect(staffRes.body.data.annualLeaveRemaining).toBe(1); // 4 - 3, never negative
  });

  it('a Teacher sees only their OWN leave requests; an approver sees all', async () => {
    const admin = await registerAndLogin('Administrator', 'admin10@alnoor.ae');
    const teacherA = await registerAndLogin('Teacher', 'teacherA@alnoor.ae');
    const teacherB = await registerAndLogin('Teacher', 'teacherB@alnoor.ae');
    await createStaff(admin.token, 'EMP-810', teacherA.userId);
    await createStaff(admin.token, 'EMP-811', teacherB.userId);
    await requestLeave(teacherA.token, '2026-07-06', '2026-07-07');
    await requestLeave(teacherB.token, '2026-07-06', '2026-07-07');

    const aView = await request(app).get('/api/v1/leave').set('Authorization', `Bearer ${teacherA.token}`);
    expect(aView.body.data.length).toBe(1);

    const adminView = await request(app).get('/api/v1/leave').set('Authorization', `Bearer ${admin.token}`);
    expect(adminView.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('blocks overlapping pending or approved leave for the same staff member', async () => {
    const admin = await registerAndLogin('Administrator', 'admin11@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher11@alnoor.ae');
    await createStaff(admin.token, 'EMP-812', teacher.userId);
    expect((await requestLeave(teacher.token, '2026-07-06', '2026-07-08')).status).toBe(201);
    const overlap = await requestLeave(teacher.token, '2026-07-08', '2026-07-10');
    expect(overlap.status).toBe(409);
  });

  it('allows Administrator or Principal to submit the existing HR leave form for another active staff member', async () => {
    const admin = await registerAndLogin('Administrator', 'admin12@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher12@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-813', teacher.userId);
    const submitted = await request(app).post('/api/v1/leave').set('Authorization', `Bearer ${admin.token}`).send({
      staffId,
      fromDate: '2026-09-06',
      toDate: '2026-09-07',
      reason: 'Annual leave - HR entered',
    });
    expect(submitted.status).toBe(201);
    expect(submitted.body.data.staff.toString()).toBe(staffId);
  });

  it('does not let a staff member submit leave for another employee', async () => {
    const admin = await registerAndLogin('Administrator', 'admin13@alnoor.ae');
    const teacherA = await registerAndLogin('Teacher', 'teacher13a@alnoor.ae');
    const teacherB = await registerAndLogin('Teacher', 'teacher13b@alnoor.ae');
    await createStaff(admin.token, 'EMP-814', teacherA.userId);
    const otherStaffId = await createStaff(admin.token, 'EMP-815', teacherB.userId);
    const submitted = await request(app).post('/api/v1/leave').set('Authorization', `Bearer ${teacherA.token}`).send({
      staffId: otherStaffId,
      fromDate: '2026-09-06',
      toDate: '2026-09-07',
      reason: 'Not mine',
    });
    expect(submitted.status).toBe(403);
  });
});
