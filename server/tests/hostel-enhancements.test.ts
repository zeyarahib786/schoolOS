import request from 'supertest';
import { createApp } from '../src/app';
import { HostelRoom } from '../src/models/HostelRoom';
import { schoolToday } from '../src/modules/attendance/attendance.dates';
const app = createApp();
async function fixture() {
  const account = async (role: string) => {
    const r = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'QA ' + role, email: role.toLowerCase() + '@example.invalid', role, password: 'StrongPass123' });
    return { h: { Authorization: 'Bearer ' + r.body.data.accessToken }, id: r.body.data.user._id };
  };
  const admin = await account('Administrator'),
    parent = await account('Parent'),
    student = await account('Student');
  const child = (
    await request(app).post('/api/v1/students').set(admin.h).send({
      refId: 'QA-HOSTEL-1',
      name: 'QA boarder',
      grade: 'Grade 7',
      gender: 'Female',
      roll: '1',
      guardianName: 'QA family',
      phone: '+971501234567',
      studentUserId: student.id,
      guardianUserId: parent.id,
    })
  ).body.data;
  const room = async (n = 1) => {
    const r = await request(app)
      .post('/api/v1/hostel/rooms')
      .set(admin.h)
      .send({ roomNumber: 'QA-' + n, block: 'QA', capacity: 3 });
    expect(r.status).toBe(201);
    return r.body.data;
  };
  return { admin, parent, student, child, room };
}
it('serializes cross-room allocation and rejects configured gender mismatches', async () => {
  const { admin, child, room } = await fixture();
  const r1 = await room(1),
    r2 = await room(2);
  const allocations = await Promise.all(
    [r1, r2].map((r) =>
      request(app)
        .post('/api/v1/hostel/rooms/' + r._id + '/allocate')
        .set(admin.h)
        .send({ studentId: child._id, bedLabel: 'Bed 1' }),
    ),
  );
  expect(allocations.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(await HostelRoom.countDocuments({ occupants: child._id })).toBe(1);
  const r3 = await room(3);
  const reviewed = await request(app)
    .patch('/api/v1/hostel/rooms/' + r3._id)
    .set(admin.h)
    .send({ genderPolicy: 'Male', expectedUpdatedAt: r3.updatedAt, reason: 'QA configured boys room' });
  expect(reviewed.status).toBe(200);
  expect(
    (
      await request(app)
        .post('/api/v1/hostel/rooms/' + r3._id + '/allocate')
        .set(admin.h)
        .send({ studentId: child._id })
    ).status,
  ).toBe(409);
});
it('protects family room payloads and permits only own gate-pass requests/cancellation', async () => {
  const { admin, parent, student, child, room } = await fixture(),
    r = await room();
  await request(app)
    .post('/api/v1/hostel/rooms/' + r._id + '/allocate')
    .set(admin.h)
    .send({ studentId: child._id, bedLabel: 'A1' });
  const other = (
    await request(app).post('/api/v1/students').set(admin.h).send({
      refId: 'QA-HOSTEL-2',
      name: 'Other private boarder',
      grade: 'Grade 8',
      gender: 'Female',
      roll: '2',
      guardianName: 'QA other',
      phone: '+971501234567',
    })
  ).body.data;
  await request(app)
    .post('/api/v1/hostel/rooms/' + r._id + '/allocate')
    .set(admin.h)
    .send({ studentId: other._id, bedLabel: 'A2' });
  for (const u of [parent, student]) {
    const list = await request(app).get('/api/v1/hostel/rooms').set(u.h);
    expect(list.body.data[0].occupants).toHaveLength(1);
    expect(list.body.data[0].allocations).toHaveLength(1);
    expect(JSON.stringify(list.body.data)).not.toContain('Other private boarder');
  }
  const day = await schoolToday(),
    pass = (
      await request(app).post('/api/v1/hostel/leave').set(parent.h).send({
        studentId: child._id,
        roomId: r._id,
        type: 'Day leave',
        fromDate: day,
        toDate: day,
        reason: 'QA family outing',
      })
    ).body.data;
  expect(
    (
      await request(app).post('/api/v1/hostel/leave').set(student.h).send({
        studentId: other._id,
        roomId: r._id,
        type: 'Day leave',
        fromDate: day,
        toDate: day,
        reason: 'Unauthorized request',
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await request(app)
        .post('/api/v1/hostel/leave/' + pass._id + '/transition')
        .set(parent.h)
        .send({ action: 'approve', expectedUpdatedAt: pass.updatedAt, reason: 'Parent cannot approve' })
    ).status,
  ).toBe(403);
  expect(
    (
      await request(app)
        .post('/api/v1/hostel/leave/' + pass._id + '/transition')
        .set(student.h)
        .send({ action: 'cancel', expectedUpdatedAt: pass.updatedAt, reason: 'QA outing cancelled' })
    ).status,
  ).toBe(200);
});
it('records pickup consent, physical departure and return, with overlap and discharge protection', async () => {
  const { admin, parent, child, room } = await fixture(),
    r = await room();
  const allocated = await request(app)
    .post('/api/v1/hostel/rooms/' + r._id + '/allocate')
    .set(admin.h)
    .send({ studentId: child._id });
  const day = await schoolToday();
  const input = {
    studentId: child._id,
    roomId: r._id,
    type: 'Day leave',
    fromDate: day,
    toDate: day,
    reason: 'QA appointment',
  };
  const requests = await Promise.all(
    [1, 2].map(() => request(app).post('/api/v1/hostel/leave').set(parent.h).send(input)),
  );
  expect(requests.map((r) => r.status).sort()).toEqual([201, 409]);
  const pass = requests.find((r) => r.status === 201)!.body.data;
  expect(
    (
      await request(app)
        .post('/api/v1/hostel/leave/' + pass._id + '/transition')
        .set(admin.h)
        .send({ action: 'approve', expectedUpdatedAt: pass.updatedAt, reason: 'Pickup missing' })
    ).status,
  ).toBe(400);
  const approved = await request(app)
    .post('/api/v1/hostel/leave/' + pass._id + '/transition')
    .set(admin.h)
    .send({
      action: 'approve',
      expectedUpdatedAt: pass.updatedAt,
      reason: 'QA consent checked',
      pickupName: 'QA guardian',
      pickupPhone: '+971501234567',
      guardianConsentConfirmed: true,
    });
  expect(approved.status).toBe(200);
  expect(
    (
      await request(app)
        .post('/api/v1/hostel/rooms/' + r._id + '/discharge')
        .set(admin.h)
        .send({
          studentId: child._id,
          expectedUpdatedAt: allocated.body.data.updatedAt,
          reason: 'Gate pass still active',
        })
    ).status,
  ).toBe(409);
  const out = await request(app)
    .post('/api/v1/hostel/leave/' + pass._id + '/transition')
    .set(admin.h)
    .send({
      action: 'mark-out',
      expectedUpdatedAt: approved.body.data.updatedAt,
      reason: 'QA authorized pickup confirmed',
    });
  expect(out.status).toBe(200);
  expect(out.body.data.departedAt).toBeTruthy();
  const returned = await request(app)
    .post('/api/v1/hostel/leave/' + pass._id + '/transition')
    .set(admin.h)
    .send({ action: 'return', expectedUpdatedAt: out.body.data.updatedAt, reason: 'QA returned to warden' });
  expect(returned.status).toBe(200);
  expect(returned.body.data.history).toHaveLength(3);
  expect(returned.body.data.returnedAt).toBeTruthy();
  expect(
    (
      await request(app)
        .post('/api/v1/hostel/rooms/' + r._id + '/discharge')
        .set(admin.h)
        .send({ studentId: child._id, expectedUpdatedAt: allocated.body.data.updatedAt, reason: 'QA boarding ended' })
    ).status,
  ).toBe(200);
});
it('roll-call corrections need version/reason, reject unsupported leave and preserve absence in bulk confirmation', async () => {
  const { admin, child, room } = await fixture(),
    r = await room();
  await request(app)
    .post('/api/v1/hostel/rooms/' + r._id + '/allocate')
    .set(admin.h)
    .send({ studentId: child._id });
  const date = await schoolToday();
  expect(
    (
      await request(app)
        .put('/api/v1/hostel/roll-call')
        .set(admin.h)
        .send({ studentId: child._id, date, status: 'On leave' })
    ).status,
  ).toBe(409);
  const absent = await request(app)
    .put('/api/v1/hostel/roll-call')
    .set(admin.h)
    .send({ studentId: child._id, date, status: 'Absent' });
  expect(absent.status).toBe(200);
  expect(
    (
      await request(app)
        .put('/api/v1/hostel/roll-call')
        .set(admin.h)
        .send({ studentId: child._id, date, status: 'Present' })
    ).status,
  ).toBe(400);
  const additional = (
    await request(app).post('/api/v1/students').set(admin.h).send({
      refId: 'QA-HOSTEL-EXTRA',
      name: 'QA second boarder',
      grade: 'Grade 8',
      gender: 'Female',
      roll: '3',
      guardianName: 'QA other family',
      phone: '+971501234567',
    })
  ).body.data;
  expect(
    (
      await request(app)
        .post('/api/v1/hostel/rooms/' + r._id + '/allocate')
        .set(admin.h)
        .send({ studentId: additional._id, bedLabel: 'B2' })
    ).status,
  ).toBe(200);
  const bulk = await request(app).put('/api/v1/hostel/roll-call/all').set(admin.h).send({ date });
  expect(bulk.status).toBe(200);
  expect(bulk.body.data.find((r: { student: { _id: string } }) => r.student._id === child._id).status).toBe('Absent');
  const inserted = bulk.body.data.find((r: { student: { _id: string } }) => r.student._id === additional._id);
  expect(inserted.updatedAt).toBeTruthy();
  expect(
    (
      await request(app).put('/api/v1/hostel/roll-call').set(admin.h).send({
        studentId: additional._id,
        date,
        status: 'Late',
        expectedUpdatedAt: inserted.updatedAt,
        reason: 'QA confirmed late arrival',
      })
    ).status,
  ).toBe(200);
  const corrected = await request(app).put('/api/v1/hostel/roll-call').set(admin.h).send({
    studentId: child._id,
    date,
    status: 'Late',
    expectedUpdatedAt: absent.body.data.updatedAt,
    reason: 'QA late return verified',
  });
  expect(corrected.status).toBe(200);
  expect(corrected.body.data.history[0].previousStatus).toBe('Absent');
  expect(
    (
      await request(app)
        .put('/api/v1/hostel/roll-call')
        .set(admin.h)
        .send({ studentId: child._id, date: '2099-01-01', status: 'Present' })
    ).status,
  ).toBe(400);
  expect((await request(app).get('/api/v1/hostel/roll-call?date=2026-02-30').set(admin.h)).status).toBe(400);
});
it('versioned room and maintenance reviews retain history and stale edits conflict', async () => {
  const { admin, room } = await fixture(),
    r = await room();
  const reviewed = await request(app)
    .patch('/api/v1/hostel/rooms/' + r._id)
    .set(admin.h)
    .send({ warden: 'QA warden', expectedUpdatedAt: r.updatedAt, reason: 'QA warden appointed' });
  expect(reviewed.status).toBe(200);
  expect(reviewed.body.data.history).toHaveLength(1);
  expect(
    (
      await request(app)
        .patch('/api/v1/hostel/rooms/' + r._id)
        .set(admin.h)
        .send({ status: 'Unavailable', expectedUpdatedAt: r.updatedAt, reason: 'Stale room inspection' })
    ).status,
  ).toBe(409);
  const m = (
    await request(app)
      .post('/api/v1/hostel/maintenance')
      .set(admin.h)
      .send({ refId: 'HM-QA', roomId: r._id, issue: 'QA repair required', category: 'Electrical', priority: 'High' })
  ).body.data;
  const resolved = await request(app)
    .post('/api/v1/hostel/maintenance/' + m._id + '/resolve')
    .set(admin.h)
    .send({
      status: 'Resolved',
      resolution: 'QA repair inspected',
      expectedUpdatedAt: m.updatedAt,
      reason: 'QA work completion',
    });
  expect(resolved.status).toBe(200);
  expect(resolved.body.data.history).toHaveLength(1);
  expect(
    (
      await request(app)
        .post('/api/v1/hostel/maintenance/' + m._id + '/resolve')
        .set(admin.h)
        .send({ resolution: 'QA stale duplicate', expectedUpdatedAt: m.updatedAt, reason: 'Stale repair review' })
    ).status,
  ).toBe(409);
});
