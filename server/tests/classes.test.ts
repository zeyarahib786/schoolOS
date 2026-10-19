import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function register(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Classes ${role}`, email, password: 'StrongPass123', role });
  return response.body.data.accessToken as string;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const validClass = { grade: 'Grade 6', section: 'A', stream: 'General', capacity: 30 };

async function createStudent(token: string, refId: string, name: string, grade = 'Grade 6 · A') {
  return request(app)
    .post('/api/v1/students')
    .set(auth(token))
    .send({
      refId,
      name,
      grade,
      gender: 'Female',
      roll: refId.slice(-2),
      guardianName: 'Guardian',
      phone: '+971501234567',
    });
}

describe('Classes & Sections API', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/v1/classes')).status).toBe(401);
  });

  it('allows authenticated read access and preserves the existing Teacher write role', async () => {
    const parent = await register('Parent', 'classes-parent@alnoor.ae');
    expect((await request(app).get('/api/v1/classes').set(auth(parent))).status).toBe(200);
    expect((await request(app).post('/api/v1/classes').set(auth(parent)).send(validClass)).status).toBe(403);

    const teacher = await register('Teacher', 'classes-teacher@alnoor.ae');
    expect((await request(app).post('/api/v1/classes').set(auth(teacher)).send(validClass)).status).toBe(201);
  });

  it('creates a section with an active teaching staff member and computes its live roster count', async () => {
    const admin = await register('Administrator', 'classes-admin@alnoor.ae');
    const staff = await request(app).post('/api/v1/staff').set(auth(admin)).send({
      refId: 'EMP-CLS-1',
      name: 'Class Teacher',
      designation: 'Teacher',
      department: 'Primary',
      type: 'Teaching',
      status: 'Active',
      email: 'class.teacher@alnoor.ae',
      phone: '+971501111111',
      joinedDate: '2026-08-01',
    });
    await createStudent(admin, 'ANS-CLS-01', 'First Learner');

    const created = await request(app)
      .post('/api/v1/classes')
      .set(auth(admin))
      .send({
        ...validClass,
        teacherStaffId: staff.body.data._id,
      });
    expect(created.status).toBe(201);
    expect(created.body.data.className).toBe('Grade 6 · A');
    expect(created.body.data.teacherStaffId.name).toBe('Class Teacher');
    expect(created.body.data.filled).toBe(1);

    await createStudent(admin, 'ANS-CLS-02', 'Second Learner');
    const list = await request(app).get('/api/v1/classes').set(auth(admin)).query({ stream: 'General' });
    expect(list.status).toBe(200);
    expect(list.body.data[0].filled).toBe(2);
  });

  it('rejects duplicate grade/section values case-insensitively', async () => {
    const admin = await register('Administrator', 'classes-duplicate@alnoor.ae');
    expect((await request(app).post('/api/v1/classes').set(auth(admin)).send(validClass)).status).toBe(201);
    const duplicate = await request(app)
      .post('/api/v1/classes')
      .set(auth(admin))
      .send({ ...validClass, section: 'a' });
    expect(duplicate.status).toBe(409);
  });

  it('rejects a non-teaching class teacher and a capacity below the existing roster', async () => {
    const admin = await register('Administrator', 'classes-safety@alnoor.ae');
    const accountant = await request(app).post('/api/v1/staff').set(auth(admin)).send({
      refId: 'EMP-CLS-2',
      name: 'School Accountant',
      designation: 'Accountant',
      department: 'Finance',
      type: 'Non-Teaching',
      status: 'Active',
      email: 'school.accountant@alnoor.ae',
      phone: '+971502222222',
      joinedDate: '2026-08-01',
    });
    const wrongTeacher = await request(app)
      .post('/api/v1/classes')
      .set(auth(admin))
      .send({
        ...validClass,
        teacherStaffId: accountant.body.data._id,
      });
    expect(wrongTeacher.status).toBe(409);

    await createStudent(admin, 'ANS-CLS-03', 'Learner One');
    await createStudent(admin, 'ANS-CLS-04', 'Learner Two');
    const unsafeCapacity = await request(app)
      .post('/api/v1/classes')
      .set(auth(admin))
      .send({ ...validClass, capacity: 1 });
    expect(unsafeCapacity.status).toBe(409);
  });

  it('validates input and records section creation in the audit trail', async () => {
    const admin = await register('Administrator', 'classes-audit@alnoor.ae');
    expect(
      (
        await request(app)
          .post('/api/v1/classes')
          .set(auth(admin))
          .send({ ...validClass, grade: 'University' })
      ).status,
    ).toBe(400);
    expect((await request(app).post('/api/v1/classes').set(auth(admin)).send(validClass)).status).toBe(201);
    const audit = await request(app).get('/api/v1/audit-log').set(auth(admin)).query({ module: 'Classes' });
    expect(audit.status).toBe(200);
    expect(audit.body.data[0].action).toContain('Created class section Grade 6 · A');
  });
});
