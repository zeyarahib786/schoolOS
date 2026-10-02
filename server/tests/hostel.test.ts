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

async function createRoom(token: string, roomNumber: string, capacity: number) {
  const res = await request(app)
    .post('/api/v1/hostel/rooms')
    .set('Authorization', `Bearer ${token}`)
    .send({ roomNumber, block: 'A', capacity });
  return res.body.data._id as string;
}

describe('Hostel API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/hostel/rooms');
    expect(res.status).toBe(401);
  });

  it('rejects room creation by a Parent', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/hostel/rooms')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ roomNumber: '101', block: 'A', capacity: 4 });
    expect(res.status).toBe(403);
  });

  it('allocates a student to a room with available beds', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const roomId = await createRoom(teacher.token, '201', 2);
    const studentId = await createStudent(teacher.token, 'ANS-3001');
    const res = await request(app)
      .post(`/api/v1/hostel/rooms/${roomId}/allocate`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId });
    expect(res.status).toBe(200);
    expect(res.body.data.occupants.length).toBe(1);
  });

  it('rejects allocation once the room is at full capacity', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const roomId = await createRoom(teacher.token, '202', 1);
    const s1 = await createStudent(teacher.token, 'ANS-3002');
    const s2 = await createStudent(teacher.token, 'ANS-3003');
    await request(app)
      .post(`/api/v1/hostel/rooms/${roomId}/allocate`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId: s1 });
    const res = await request(app)
      .post(`/api/v1/hostel/rooms/${roomId}/allocate`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId: s2 });
    expect(res.status).toBe(409);
  });

  it('CONCURRENCY: two simultaneous requests for the LAST bed - exactly one succeeds', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const roomId = await createRoom(teacher.token, '203', 1);
    const s1 = await createStudent(teacher.token, 'ANS-3004');
    const s2 = await createStudent(teacher.token, 'ANS-3005');
    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/v1/hostel/rooms/${roomId}/allocate`)
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({ studentId: s1 }),
      request(app)
        .post(`/api/v1/hostel/rooms/${roomId}/allocate`)
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({ studentId: s2 }),
    ]);
    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);
  });

  it('a Parent sees only rooms their linked child occupies', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent2@alnoor.ae');
    const myChildRoom = await createRoom(teacher.token, '204', 4);
    const otherChildRoom = await createRoom(teacher.token, '205', 4);
    const myChildId = await createStudent(teacher.token, 'ANS-3006', parent.userId);
    const otherChildId = await createStudent(teacher.token, 'ANS-3007');
    await request(app)
      .post(`/api/v1/hostel/rooms/${myChildRoom}/allocate`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId: myChildId });
    await request(app)
      .post(`/api/v1/hostel/rooms/${otherChildRoom}/allocate`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId: otherChildId });

    const res = await request(app).get('/api/v1/hostel/rooms').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('persists a hostel leave request and its approval/return lifecycle', async () => {
    const teacher = await registerAndLogin('Teacher', 'hostel-leave@alnoor.ae');
    const roomId = await createRoom(teacher.token, 'HL-101', 2);
    const studentId = await createStudent(teacher.token, 'ANS-3101');
    await request(app).post(`/api/v1/hostel/rooms/${roomId}/allocate`).set('Authorization', `Bearer ${teacher.token}`).send({ studentId });

    const created = await request(app).post('/api/v1/hostel/leave').set('Authorization', `Bearer ${teacher.token}`).send({
      studentId, roomId, type: 'Weekend leave', fromDate: '2026-09-10', toDate: '2026-09-11', reason: 'Family event',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('Requested');
    const leaveId = created.body.data._id as string;

    const approved = await request(app).post(`/api/v1/hostel/leave/${leaveId}/transition`).set('Authorization', `Bearer ${teacher.token}`).send({ action: 'approve' });
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe('Approved');

    const returned = await request(app).post(`/api/v1/hostel/leave/${leaveId}/transition`).set('Authorization', `Bearer ${teacher.token}`).send({ action: 'return' });
    expect(returned.status).toBe(200);
    expect(returned.body.data.status).toBe('Returned');

    const repeated = await request(app).post(`/api/v1/hostel/leave/${leaveId}/transition`).set('Authorization', `Bearer ${teacher.token}`).send({ action: 'return' });
    expect(repeated.status).toBe(409);
  });

  it('rejects leave for a student who is not allocated to the selected room', async () => {
    const teacher = await registerAndLogin('Teacher', 'hostel-invalid-leave@alnoor.ae');
    const roomId = await createRoom(teacher.token, 'HL-102', 2);
    const studentId = await createStudent(teacher.token, 'ANS-3102');
    const res = await request(app).post('/api/v1/hostel/leave').set('Authorization', `Bearer ${teacher.token}`).send({
      studentId, roomId, type: 'Medical', fromDate: '2026-09-10', toDate: '2026-09-10', reason: 'Appointment',
    });
    expect(res.status).toBe(400);
  });

  it('persists roll-call and mark-all keeps approved leave status intact', async () => {
    const teacher = await registerAndLogin('Teacher', 'hostel-roll@alnoor.ae');
    const roomId = await createRoom(teacher.token, 'RC-101', 2);
    const first = await createStudent(teacher.token, 'ANS-3201');
    const second = await createStudent(teacher.token, 'ANS-3202');
    for (const studentId of [first, second]) {
      await request(app).post(`/api/v1/hostel/rooms/${roomId}/allocate`).set('Authorization', `Bearer ${teacher.token}`).send({ studentId });
    }
    const date = '2026-09-09';
    await request(app).put('/api/v1/hostel/roll-call').set('Authorization', `Bearer ${teacher.token}`).send({ studentId: first, date, status: 'On leave' });
    await request(app).put('/api/v1/hostel/roll-call').set('Authorization', `Bearer ${teacher.token}`).send({ studentId: second, date, status: 'Absent' });

    const marked = await request(app).put('/api/v1/hostel/roll-call/all').set('Authorization', `Bearer ${teacher.token}`).send({ date });
    expect(marked.status).toBe(200);
    const statuses = Object.fromEntries(marked.body.data.map((entry: { student: { _id: string }; status: string }) => [entry.student._id, entry.status]));
    expect(statuses[first]).toBe('On leave');
    expect(statuses[second]).toBe('Present');
  });

  it('rejects roll-call for a non-boarder', async () => {
    const teacher = await registerAndLogin('Teacher', 'hostel-roll-invalid@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-3203');
    const res = await request(app).put('/api/v1/hostel/roll-call').set('Authorization', `Bearer ${teacher.token}`).send({ studentId, date: '2026-09-09', status: 'Present' });
    expect(res.status).toBe(400);
  });

  it('persists and resolves a hostel maintenance request', async () => {
    const teacher = await registerAndLogin('Teacher', 'hostel-maintenance@alnoor.ae');
    const roomId = await createRoom(teacher.token, 'HM-ROOM-1', 2);
    const created = await request(app).post('/api/v1/hostel/maintenance').set('Authorization', `Bearer ${teacher.token}`).send({
      refId: 'HM-9001', roomId, issue: 'Air conditioner is not cooling', category: 'HVAC', priority: 'High',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('Open');
    expect(created.body.data.room.roomNumber).toBe('HM-ROOM-1');

    const listed = await request(app).get('/api/v1/hostel/maintenance').set('Authorization', `Bearer ${teacher.token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.some((item: { refId: string }) => item.refId === 'HM-9001')).toBe(true);

    const id = created.body.data._id as string;
    const resolved = await request(app).post(`/api/v1/hostel/maintenance/${id}/resolve`).set('Authorization', `Bearer ${teacher.token}`);
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.status).toBe('Resolved');
    expect(resolved.body.data.resolvedBy).toBeTruthy();

    const repeated = await request(app).post(`/api/v1/hostel/maintenance/${id}/resolve`).set('Authorization', `Bearer ${teacher.token}`);
    expect(repeated.status).toBe(409);
  });

  it('rejects a maintenance request for a missing room', async () => {
    const teacher = await registerAndLogin('Teacher', 'hostel-maintenance-invalid@alnoor.ae');
    const res = await request(app).post('/api/v1/hostel/maintenance').set('Authorization', `Bearer ${teacher.token}`).send({
      refId: 'HM-9002', roomId: '507f1f77bcf86cd799439011', issue: 'Broken study chair', category: 'Furniture', priority: 'Low',
    });
    expect(res.status).toBe(400);
  });
});
