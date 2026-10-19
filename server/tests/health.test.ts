import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
}

async function createStudent(
  token: string,
  refId: string,
  guardianUserId?: string,
  status: 'Active' | 'Inactive' = 'Active',
) {
  const res = await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send({
    refId,
    name: 'Fatima Al Hashimi',
    grade: 'Grade 10 · A',
    gender: 'Female',
    roll: '12',
    guardianName: 'Khalid',
    guardianUserId,
    status,
    phone: '+971501234567',
  });
  expect(res.status).toBe(201);
  return res.body.data._id as string;
}

const validVisit = { reason: 'Headache', treatment: 'Rest and water', outcome: 'Returned to class' };

describe('Health API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/health-records');
    expect(res.status).toBe(401);
  });

  it('rejects visit recording by a Parent', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-9101');
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/health-records')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ studentId, ...validVisit });
    expect(res.status).toBe(403);
  });

  it('allows a Teacher to RECORD a visit', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-9102');
    const res = await request(app)
      .post('/api/v1/health-records')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId, ...validVisit });
    expect(res.status).toBe(201);
  });

  it('rejects a clinic visit for a missing or inactive student', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-health-active-check@alnoor.ae');
    const missing = await request(app)
      .post('/api/v1/health-records')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ studentId: '64b7f9c9a1b2c3d4e5f60789', ...validVisit });
    expect(missing.status).toBe(404);
    const inactiveId = await createStudent(admin.token, 'ANS-9102-INACTIVE', undefined, 'Inactive');
    const inactive = await request(app)
      .post('/api/v1/health-records')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ studentId: inactiveId, ...validVisit });
    expect(inactive.status).toBe(409);
  });

  it('THE DELIBERATE ASYMMETRY, PROVEN END TO END: a Teacher who just recorded a visit sees an EMPTY list when browsing afterward - they can act, but cannot browse the clinic log', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-9103');
    await request(app)
      .post('/api/v1/health-records')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId, ...validVisit });

    const res = await request(app).get('/api/v1/health-records').set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0); // genuinely empty, not an error - the visit exists, the Teacher just can't see it
  });

  it('Administrator and Principal DO see every visit, including ones recorded by a Teacher', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-9104');
    await request(app)
      .post('/api/v1/health-records')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId, ...validVisit });

    const admin = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    const res = await request(app).get('/api/v1/health-records').set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('a Parent sees only visits for their linked child', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent2@alnoor.ae');
    const office = await registerAndLogin('Administrator', 'health-family-link-office@example.invalid');
    const myChildId = await createStudent(office.token, 'ANS-9105', parent.userId);
    const otherChildId = await createStudent(teacher.token, 'ANS-9106');
    await request(app)
      .post('/api/v1/health-records')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId: myChildId, ...validVisit });
    await request(app)
      .post('/api/v1/health-records')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId: otherChildId, ...validVisit });

    const res = await request(app).get('/api/v1/health-records').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('persists full clinic UI fields and administrator follow-up updates', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-health-workflow@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-9110');
    const created = await request(app)
      .post('/api/v1/health-records')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        studentId,
        reason: 'High temperature',
        treatment: 'Rest and fluids',
        outcome: 'Under observation',
        severity: 'Urgent',
        vitals: 'Temp 38.2 C',
        medicine: 'Paracetamol 250mg',
      });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      severity: 'Urgent',
      outcome: 'Under observation',
      parentContacted: false,
    });
    const id = created.body.data._id as string;

    const updated = await request(app)
      .patch(`/api/v1/health-records/${id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        outcome: 'Sent home',
        parentContacted: true,
        expectedUpdatedAt: created.body.data.updatedAt,
        reason: 'Guardian collected student',
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.outcome).toBe('Sent home');
    expect(updated.body.data.parentContacted).toBe(true);
    expect(updated.body.data.parentContactedAt).toBeTruthy();
  });

  it('does not allow a Teacher to update clinic follow-up fields', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-health-owner@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-9111');
    const created = await request(app)
      .post('/api/v1/health-records')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ studentId, ...validVisit });
    const teacher = await registerAndLogin('Teacher', 'teacher-health-update@alnoor.ae');
    const res = await request(app)
      .patch(`/api/v1/health-records/${created.body.data._id}`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ parentContacted: true });
    expect(res.status).toBe(403);
  });
});
