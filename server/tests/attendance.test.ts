import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent' | 'Accountant', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
}

async function createStudent(token: string, refId: string, guardianUserId?: string) {
  // Account linking belongs to school managers; teachers can still mark registers.
  if (guardianUserId) token = (await registerAndLogin('Administrator', 'fixture-manager@example.invalid')).token;
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

describe('Attendance API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/attendance');
    expect(res.status).toBe(401);
  });

  it('rejects marking attendance by a Parent (read-only role)', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/attendance/mark')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({
        date: '2026-06-14',
        session: 'AM',
        entries: [{ studentId: '64b7f9c9a1b2c3d4e5f60789', status: 'Present' }],
      });
    expect(res.status).toBe(403);
  });

  it('allows a Teacher to mark attendance for a class in one bulk request', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-9101');
    const res = await request(app)
      .post('/api/v1/attendance/mark')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ date: '2026-06-14', session: 'AM', entries: [{ studentId, status: 'Present' }] });
    expect(res.status).toBe(201);
    expect(res.body.data.markedCount).toBe(1);
  });

  it('rejects re-marking the SAME student/date/session with a 409, not a silent duplicate', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-9102');
    await request(app)
      .post('/api/v1/attendance/mark')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ date: '2026-06-14', session: 'AM', entries: [{ studentId, status: 'Present' }] });
    const res = await request(app)
      .post('/api/v1/attendance/mark')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ date: '2026-06-14', session: 'AM', entries: [{ studentId, status: 'Late' }] });
    expect(res.status).toBe(409);
  });

  it('allows marking the SAME student for a DIFFERENT session on the same date (AM vs PM are distinct)', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-9103');
    await request(app)
      .post('/api/v1/attendance/mark')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ date: '2026-06-14', session: 'AM', entries: [{ studentId, status: 'Present' }] });
    const res = await request(app)
      .post('/api/v1/attendance/mark')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ date: '2026-06-14', session: 'PM', entries: [{ studentId, status: 'Present' }] });
    expect(res.status).toBe(201);
  });

  it('saves a live register idempotently so corrections update the existing row', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-correct@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-9110');
    const first = await request(app)
      .put('/api/v1/attendance/mark')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ date: '2026-06-15', session: 'AM', entries: [{ studentId, status: 'Present' }] });
    expect(first.status).toBe(200);
    expect(first.body.data.markedCount).toBe(1);

    const corrected = await request(app)
      .put('/api/v1/attendance/mark')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ date: '2026-06-15', session: 'AM', entries: [{ studentId, status: 'Late' }] });
    expect(corrected.status).toBe(200);
    expect(corrected.body.data.markedCount).toBe(1);

    const list = await request(app)
      .get('/api/v1/attendance')
      .set('Authorization', `Bearer ${teacher.token}`)
      .query({ studentId, dateFrom: '2026-06-15', dateTo: '2026-06-15', session: 'AM' });
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].status).toBe('Late');
  });

  it("a Parent with no linked student sees an empty attendance list, not an error or everyone else's data", async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-9104');
    await request(app)
      .post('/api/v1/attendance/mark')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ date: '2026-06-14', session: 'AM', entries: [{ studentId, status: 'Present' }] });

    const parent = await registerAndLogin('Parent', 'parent2@alnoor.ae');
    const res = await request(app).get('/api/v1/attendance').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it('a Parent sees attendance ONLY for their linked child, not other students', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher5@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent3@alnoor.ae');
    const myChildId = await createStudent(teacher.token, 'ANS-9105', parent.userId);
    const otherChildId = await createStudent(teacher.token, 'ANS-9106');

    await request(app)
      .post('/api/v1/attendance/mark')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        date: '2026-06-14',
        session: 'AM',
        entries: [
          { studentId: myChildId, status: 'Present' },
          { studentId: otherChildId, status: 'Absent' },
        ],
      });

    const res = await request(app).get('/api/v1/attendance').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].student._id ?? res.body.data[0].student).toBeDefined();
  });

  it('Administrator sees all attendance records, unscoped', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher6@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-9107');
    await request(app)
      .post('/api/v1/attendance/mark')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ date: '2026-06-14', session: 'AM', entries: [{ studentId, status: 'Present' }] });

    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const res = await request(app).get('/api/v1/attendance').set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects a bulk-mark request with more than 200 entries', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher7@alnoor.ae');
    const entries = Array.from({ length: 201 }, () => ({ studentId: '64b7f9c9a1b2c3d4e5f60789', status: 'Present' }));
    const res = await request(app)
      .post('/api/v1/attendance/mark')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ date: '2026-06-14', session: 'AM', entries });
    expect(res.status).toBe(400);
  });

  it('persists staff self-attendance and lets office roles review it for the day', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-staff-att@alnoor.ae');
    const marked = await request(app)
      .put('/api/v1/attendance/staff/me')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ date: '2026-06-16', status: 'Remote' });
    expect(marked.status).toBe(200);
    expect(marked.body.data).toMatchObject({ status: 'Remote', role: 'Teacher' });

    const corrected = await request(app)
      .put('/api/v1/attendance/staff/me')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ date: '2026-06-16', status: 'Present' });
    expect(corrected.status).toBe(200);
    expect(corrected.body.data.status).toBe('Present');

    const accountant = await registerAndLogin('Accountant', 'accountant-staff-att@alnoor.ae');
    const list = await request(app)
      .get('/api/v1/attendance/staff')
      .set('Authorization', `Bearer ${accountant.token}`)
      .query({ date: '2026-06-16' });
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ status: 'Present', role: 'Teacher' });
  });

  it('rejects staff attendance marking by a Parent', async () => {
    const parent = await registerAndLogin('Parent', 'parent-staff-att@alnoor.ae');
    const res = await request(app)
      .put('/api/v1/attendance/staff/me')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ status: 'Present' });
    expect(res.status).toBe(403);
  });

  it('persists parent absence requests and approval marks affected sessions as Excused', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-absence@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent-absence@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-9120', parent.userId);

    const created = await request(app)
      .post('/api/v1/attendance/absence-requests')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({
        studentId,
        fromDate: '2026-06-17',
        toDate: '2026-06-18',
        type: 'Medical',
        note: 'Doctor advised rest.',
      });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ status: 'Pending', days: 2, type: 'Medical' });

    const approved = await request(app)
      .post(`/api/v1/attendance/absence-requests/${created.body.data._id}/decision`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ decision: 'Approved' });
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe('Approved');

    const attendance = await request(app)
      .get('/api/v1/attendance')
      .set('Authorization', `Bearer ${teacher.token}`)
      .query({ studentId, dateFrom: '2026-06-17', dateTo: '2026-06-18', status: 'Excused' });
    expect(attendance.status).toBe(200);
    expect(attendance.body.data).toHaveLength(4);
  });

  it('allows a parent to cancel only their pending linked-child absence request', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-absence-cancel@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent-absence-cancel@alnoor.ae');
    const stranger = await registerAndLogin('Parent', 'parent-absence-stranger@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-9121', parent.userId);
    const otherStudentId = await createStudent(teacher.token, 'ANS-9122');

    const rejected = await request(app)
      .post('/api/v1/attendance/absence-requests')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({
        studentId: otherStudentId,
        fromDate: '2026-06-19',
        toDate: '2026-06-19',
        type: 'Other',
        note: 'No link.',
      });
    expect(rejected.status).toBe(404);

    const created = await request(app)
      .post('/api/v1/attendance/absence-requests')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ studentId, fromDate: '2026-06-19', toDate: '2026-06-19', type: 'Other', note: 'Family need.' });
    expect(created.status).toBe(201);

    const strangerCancel = await request(app)
      .post(`/api/v1/attendance/absence-requests/${created.body.data._id}/cancel`)
      .set('Authorization', `Bearer ${stranger.token}`);
    expect(strangerCancel.status).toBe(404);

    const cancelled = await request(app)
      .post(`/api/v1/attendance/absence-requests/${created.body.data._id}/cancel`)
      .set('Authorization', `Bearer ${parent.token}`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe('Cancelled');
  });
});
