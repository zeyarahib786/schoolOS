import request from 'supertest';
import { createApp } from '../src/app';
import { Student } from '../src/models/Student';
const app = createApp();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
async function user(role: string) {
  const r = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: role, email: `${role.toLowerCase()}@example.invalid`, password: 'LocalFixture123!', role });
  return { token: r.body.data.accessToken as string, id: r.body.data.user._id as string };
}
async function setup() {
  const admin = await user('Administrator');
  const parent = await user('Parent');
  const student = await user('Student');
  const child = await Student.create({
    refId: 'TEST-001',
    name: 'Test child',
    grade: 'Grade 7 · A',
    gender: 'Female',
    roll: '01',
    guardianName: 'Guardian',
    phone: '123',
    status: 'Active',
    guardianUserId: parent.id,
    studentUserId: student.id,
  });
  return { admin, parent, student, child };
}
const createSection = (token: string, extra = {}) =>
  request(app)
    .post('/api/v1/classes')
    .set(auth(token))
    .send({ grade: 'Grade 7', section: 'A', capacity: 30, stream: 'General', ...extra });
describe('School-ready classes and attendance', () => {
  it('updates rooms and capacity with stale edit protection', async () => {
    const { admin } = await setup();
    const c = await createSection(admin.token);
    expect(c.status).toBe(201);
    const body = {
      capacity: 35,
      stream: 'Science',
      room: 'A204',
      status: 'Active',
      expectedUpdatedAt: c.body.data.updatedAt,
    };
    const updated = await request(app)
      .patch('/api/v1/classes/' + c.body.data._id)
      .set(auth(admin.token))
      .send(body);
    expect(updated.status).toBe(200);
    expect(updated.body.data.room).toBe('A204');
    expect(
      (
        await request(app)
          .patch('/api/v1/classes/' + c.body.data._id)
          .set(auth(admin.token))
          .send(body)
      ).status,
    ).toBe(409);
  });
  it('blocks occupied archive, insufficient capacity and teacher edits', async () => {
    const { admin } = await setup();
    const teacher = await user('Teacher');
    const c = await createSection(admin.token);
    const path = '/api/v1/classes/' + c.body.data._id;
    const body = { capacity: 30, stream: 'General', status: 'Archived', expectedUpdatedAt: c.body.data.updatedAt };
    expect((await request(app).patch(path).set(auth(admin.token)).send(body)).status).toBe(409);
    expect(
      (
        await request(app)
          .patch(path)
          .set(auth(teacher.token))
          .send({ ...body, status: 'Active' })
      ).status,
    ).toBe(403);
  });
  it('archives and restores an empty section and rejects invalid teaching assignment', async () => {
    const { admin, child } = await setup();
    await Student.deleteOne({ _id: child._id });
    const c = await createSection(admin.token);
    const path = '/api/v1/classes/' + c.body.data._id;
    const b = { capacity: 30, stream: 'General', status: 'Archived', expectedUpdatedAt: c.body.data.updatedAt };
    const a = await request(app).patch(path).set(auth(admin.token)).send(b);
    expect(a.status).toBe(200);
    expect(
      (
        await request(app)
          .patch(path)
          .set(auth(admin.token))
          .send({ ...b, status: 'Active', expectedUpdatedAt: a.body.data.updatedAt })
      ).status,
    ).toBe(200);
    const teacher = await user('Teacher');
    expect(
      (
        await request(app)
          .patch(path)
          .set(auth(admin.token))
          .send({ ...b, teacherStaffId: teacher.id })
      ).status,
    ).toBe(409);
  });
  it('normalizes dates and saves explicit statuses with corrections and stale protection', async () => {
    const { admin, child } = await setup();
    const path = '/api/v1/attendance/register';
    const body: {
      date: string;
      session: string;
      entries: Array<{ studentId: string; status: string; expectedUpdatedAt: string | null }>;
    } = {
      date: '2026-09-01',
      session: 'AM',
      entries: [{ studentId: String(child._id), status: 'Present', expectedUpdatedAt: null }],
    };
    expect((await request(app).put(path).set(auth(admin.token)).send(body)).status).toBe(200);
    const list = await request(app)
      .get('/api/v1/attendance')
      .set(auth(admin.token))
      .query({ studentId: String(child._id) });
    const r = list.body.data[0];
    expect(r.date).toBe('2026-09-01T00:00:00.000Z');
    expect(list.body.meta.pagination.total).toBe(1);
    expect((await request(app).put(path).set(auth(admin.token)).send(body)).status).toBe(409);
    body.entries[0] = { ...body.entries[0], status: 'Late', expectedUpdatedAt: r.updatedAt };
    expect((await request(app).put(path).set(auth(admin.token)).send(body)).status).toBe(400);
    expect(
      (
        await request(app)
          .put(path)
          .set(auth(admin.token))
          .send({ ...body, correctionReason: 'Late arrival confirmed' })
      ).status,
    ).toBe(200);
  });
  it('rejects duplicate, missing, inactive, future and invalid calendar entries atomically', async () => {
    const { admin, child } = await setup();
    const path = '/api/v1/attendance/register',
      e = { studentId: String(child._id), status: 'Present', expectedUpdatedAt: null };
    for (const body of [
      { date: '2026-09-01', session: 'AM', entries: [e, e] },
      { date: '2099-01-01', session: 'AM', entries: [e] },
      { date: '2026-02-30', session: 'AM', entries: [e] },
      { date: '2026-09-01', session: 'AM', entries: [e, { ...e, studentId: 'ffffffffffffffffffffffff' }] },
    ])
      expect((await request(app).put(path).set(auth(admin.token)).send(body)).status).toBe(400);
    await Student.updateOne({ _id: child._id }, { $set: { status: 'Inactive' } });
    expect(
      (
        await request(app)
          .put(path)
          .set(auth(admin.token))
          .send({ date: '2026-09-01', session: 'AM', entries: [e] })
      ).status,
    ).toBe(400);
    expect((await request(app).get('/api/v1/attendance').set(auth(admin.token))).body.data).toHaveLength(0);
  });
  it('scopes Parent and Student reads and intersects requested children', async () => {
    const { admin, parent, student, child } = await setup();
    const other = await Student.create({
      refId: 'TEST-002',
      name: 'Other',
      grade: 'Grade 7 · B',
      gender: 'Male',
      roll: '02',
      guardianName: 'Other',
      phone: '123',
    });
    await request(app)
      .post('/api/v1/attendance/mark')
      .set(auth(admin.token))
      .send({
        date: '2026-09-01',
        session: 'AM',
        entries: [
          { studentId: String(child._id), status: 'Present' },
          { studentId: String(other._id), status: 'Absent' },
        ],
      });
    for (const u of [parent, student]) {
      const r = await request(app).get('/api/v1/attendance').set(auth(u.token));
      expect(r.body.data).toHaveLength(1);
      expect(
        (
          await request(app)
            .get('/api/v1/attendance')
            .set(auth(u.token))
            .query({ studentId: String(other._id) })
        ).body.data,
      ).toHaveLength(0);
      expect((await request(app).put('/api/v1/attendance/register').set(auth(u.token)).send({})).status).toBe(403);
    }
  });
  it('prevents absence query leaks and overlapping requests', async () => {
    const { admin, parent, child } = await setup();
    const other = await Student.create({
      refId: 'TEST-002',
      name: 'Other',
      grade: 'Grade 7 · B',
      gender: 'Male',
      roll: '02',
      guardianName: 'Other',
      phone: '123',
    });
    const b = {
      studentId: String(child._id),
      fromDate: '2026-09-01',
      toDate: '2026-09-02',
      note: 'Medical appointment',
      type: 'Medical',
    };
    expect(
      (await request(app).post('/api/v1/attendance/absence-requests').set(auth(parent.token)).send(b)).status,
    ).toBe(201);
    expect(
      (await request(app).post('/api/v1/attendance/absence-requests').set(auth(parent.token)).send(b)).status,
    ).toBe(409);
    await request(app)
      .post('/api/v1/attendance/absence-requests')
      .set(auth(admin.token))
      .send({ ...b, studentId: String(other._id) });
    expect(
      (
        await request(app)
          .get('/api/v1/attendance/absence-requests')
          .set(auth(parent.token))
          .query({ studentId: String(other._id) })
      ).body.data,
    ).toHaveLength(0);
  });
  it('approves atomically without replacing Present/Late and prevents repeated decision', async () => {
    const { admin, parent, child } = await setup();
    await request(app)
      .post('/api/v1/attendance/mark')
      .set(auth(admin.token))
      .send({ date: '2026-09-01', session: 'AM', entries: [{ studentId: String(child._id), status: 'Present' }] });
    const r = await request(app)
      .post('/api/v1/attendance/absence-requests')
      .set(auth(parent.token))
      .send({ studentId: String(child._id), fromDate: '2026-09-01', toDate: '2026-09-01', note: 'Appointment' });
    const path = '/api/v1/attendance/absence-requests/' + r.body.data._id + '/decision';
    expect(
      (await request(app).post(path).set(auth(admin.token)).send({ decision: 'Approved', note: 'Confirmed' })).status,
    ).toBe(200);
    const records = (await request(app).get('/api/v1/attendance').set(auth(parent.token))).body.data;
    expect(records.map((r: { status: string }) => r.status).sort()).toEqual(['Excused', 'Present']);
    expect((await request(app).post(path).set(auth(admin.token)).send({ decision: 'Rejected' })).status).toBe(409);
  });
  it('uses consistent attendance rates in Student profiles, excluding Excused', async () => {
    const { admin, child } = await setup();
    for (const [date, status] of [
      ['2026-09-01', 'Present'],
      ['2026-09-02', 'Absent'],
      ['2026-09-03', 'Excused'],
    ])
      expect(
        (
          await request(app)
            .post('/api/v1/attendance/mark')
            .set(auth(admin.token))
            .send({ date, session: 'AM', entries: [{ studentId: String(child._id), status }] })
        ).status,
      ).toBe(201);
    const row = (
      await request(app)
        .get('/api/v1/students/' + child._id)
        .set(auth(admin.token))
    ).body.data;
    expect(row.attendanceRecords).toBe(3);
    expect(row.attendanceEligibleRecords).toBe(2);
    expect(row.attendancePct).toBe(50);
  });
  it('rolls back the whole register if a later entry has a stale timestamp', async () => {
    const { admin, child } = await setup();
    const other = await Student.create({
      refId: 'TEST-002',
      name: 'Other child',
      grade: 'Grade 7 · A',
      gender: 'Male',
      roll: '02',
      guardianName: 'Other',
      phone: '123',
    });
    const path = '/api/v1/attendance/register',
      date = '2026-09-01';
    const entries = [child, other].map((s) => ({
      studentId: String(s._id),
      status: 'Present',
      expectedUpdatedAt: null,
    }));
    expect((await request(app).put(path).set(auth(admin.token)).send({ date, session: 'AM', entries })).status).toBe(
      200,
    );
    const rows = (await request(app).get('/api/v1/attendance').set(auth(admin.token))).body.data;
    const versions = rows.map((r: { student: { _id: string }; updatedAt: string }) => ({
      studentId: r.student._id,
      status: 'Absent',
      expectedUpdatedAt: r.updatedAt,
    }));
    const first = versions.find((e: { studentId: string }) => e.studentId === String(child._id));
    const second = versions.find((e: { studentId: string }) => e.studentId === String(other._id));
    expect(
      (
        await request(app)
          .put(path)
          .set(auth(admin.token))
          .send({ date, session: 'AM', entries: [{ ...second, status: 'Late' }], correctionReason: 'Another editor' })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .put(path)
          .set(auth(admin.token))
          .send({ date, session: 'AM', entries: [first, second], correctionReason: 'Stale batch' })
      ).status,
    ).toBe(409);
    const result = (await request(app).get('/api/v1/attendance').set(auth(admin.token))).body.data;
    expect(result.find((r: { student: { _id: string } }) => r.student._id === String(child._id)).status).toBe(
      'Present',
    );
    expect(result.find((r: { student: { _id: string } }) => r.student._id === String(other._id)).status).toBe('Late');
  });
});
