import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent' | 'Student', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
}

async function createStaff(token: string, refId: string) {
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
  return res.body.data._id as string;
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

async function createSlot(token: string, teacherStaffId: string, startTime = '14:30') {
  const res = await request(app)
    .post('/api/v1/meetings')
    .set('Authorization', `Bearer ${token}`)
    .send({ teacherStaffId, date: '2026-07-10', startTime });
  return res.body.data._id as string;
}

describe('Meetings API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/meetings');
    expect(res.status).toBe(401);
  });

  it('a Parent can BROWSE slots (open read) but cannot PUBLISH one', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const browse = await request(app).get('/api/v1/meetings').set('Authorization', `Bearer ${parent.token}`);
    expect(browse.status).toBe(200);
    const publish = await request(app)
      .post('/api/v1/meetings')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ teacherStaffId: '64b7f9c9a1b2c3d4e5f60789', date: '2026-07-10', startTime: '14:30' });
    expect(publish.status).toBe(403);
  });

  it('publishing the same teacher/date/time twice gets a 409 - double-publication prevented', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-901');
    await createSlot(admin.token, staffId);
    const res = await request(app)
      .post('/api/v1/meetings')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ teacherStaffId: staffId, date: '2026-07-10', startTime: '14:30' });
    expect(res.status).toBe(409);
  });

  it('only a Parent may book - a Student cannot, even for themselves', async () => {
    const admin = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-902');
    const slotId = await createSlot(admin.token, staffId);
    const student = await registerAndLogin('Student', 'student1@alnoor.ae');
    const res = await request(app)
      .post(`/api/v1/meetings/${slotId}/book`)
      .set('Authorization', `Bearer ${student.token}`)
      .send({ studentId: '64b7f9c9a1b2c3d4e5f60789' });
    expect(res.status).toBe(403);
  });

  it('a Parent cannot book for a child that is NOT theirs - ownership resolved server-side, not trusted from the body', async () => {
    const admin = await registerAndLogin('Administrator', 'admin3@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-903');
    const slotId = await createSlot(admin.token, staffId);
    const otherParent = await registerAndLogin('Parent', 'otherparent@alnoor.ae');
    const strangerStudentId = await createStudent(admin.token, 'ANS-9001', otherParent.userId);
    const parent = await registerAndLogin('Parent', 'parent2@alnoor.ae');
    const res = await request(app)
      .post(`/api/v1/meetings/${slotId}/book`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ studentId: strangerStudentId });
    expect(res.status).toBe(403);
  });

  it('a Parent books an open slot for their own child successfully', async () => {
    const admin = await registerAndLogin('Administrator', 'admin4@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-904');
    const slotId = await createSlot(admin.token, staffId);
    const parent = await registerAndLogin('Parent', 'parent3@alnoor.ae');
    const childId = await createStudent(admin.token, 'ANS-9002', parent.userId);
    const res = await request(app)
      .post(`/api/v1/meetings/${slotId}/book`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ studentId: childId });
    expect(res.status).toBe(200);
    expect(res.body.data.bookedBy).toBe(parent.userId);
  });

  it('booking a nonexistent slot gets 404, not a generic failure', async () => {
    const admin = await registerAndLogin('Administrator', 'admin5@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent4@alnoor.ae');
    const childId = await createStudent(admin.token, 'ANS-9003', parent.userId);
    const res = await request(app)
      .post('/api/v1/meetings/64b7f9c9a1b2c3d4e5f60789/book')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ studentId: childId });
    expect(res.status).toBe(404);
  });

  it('THE BOOKING RACE, PROVEN: two parents claiming the same slot simultaneously - exactly one wins, the other gets 409', async () => {
    const admin = await registerAndLogin('Administrator', 'admin6@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-905');
    const slotId = await createSlot(admin.token, staffId);
    const parentA = await registerAndLogin('Parent', 'parentA@alnoor.ae');
    const parentB = await registerAndLogin('Parent', 'parentB@alnoor.ae');
    const childA = await createStudent(admin.token, 'ANS-9004', parentA.userId);
    const childB = await createStudent(admin.token, 'ANS-9005', parentB.userId);

    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/v1/meetings/${slotId}/book`)
        .set('Authorization', `Bearer ${parentA.token}`)
        .send({ studentId: childA }),
      request(app)
        .post(`/api/v1/meetings/${slotId}/book`)
        .set('Authorization', `Bearer ${parentB.token}`)
        .send({ studentId: childB }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);
  });

  it('the onlyOpen filter hides booked slots', async () => {
    const admin = await registerAndLogin('Administrator', 'admin7@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-906');
    const bookedSlotId = await createSlot(admin.token, staffId, '09:00');
    await createSlot(admin.token, staffId, '10:00');
    const parent = await registerAndLogin('Parent', 'parent5@alnoor.ae');
    const childId = await createStudent(admin.token, 'ANS-9006', parent.userId);
    await request(app)
      .post(`/api/v1/meetings/${bookedSlotId}/book`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ studentId: childId });

    const res = await request(app)
      .get('/api/v1/meetings')
      .set('Authorization', `Bearer ${admin.token}`)
      .query({ onlyOpen: true });
    expect(res.body.data.every((s: { bookedBy: string | null }) => s.bookedBy === null)).toBe(true);
  });
});
