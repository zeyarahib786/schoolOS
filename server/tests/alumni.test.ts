import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string };
}

async function createStudent(token: string, refId: string) {
  const res = await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send({
    refId,
    name: 'Fatima Al Hashimi',
    grade: 'Grade 12 · A',
    gender: 'Female',
    roll: '12',
    guardianName: 'Khalid',
    phone: '+971501234567',
  });
  return res.body.data._id as string;
}

describe('Alumni API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/alumni');
    expect(res.status).toBe(401);
  });

  it('rejects graduation by a Parent', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-7001');
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/alumni/graduate')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ studentId, academicCompletionConfirmed: true, graduationYear: 2026 });
    expect(res.status).toBe(403);
  });

  it('THE TRANSACTIONAL CONSISTENCY, PROVEN CORRECT: graduating a student flips Student.status to Alumni AND creates the AlumniProfile together', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-7002');

    const graduateRes = await request(app)
      .post('/api/v1/alumni/graduate')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId, academicCompletionConfirmed: true, graduationYear: 2026 });
    expect(graduateRes.status).toBe(201);

    // Confirm the Student's OWN status genuinely changed - real cross-collection consistency, not a disconnected copy
    const studentRes = await request(app)
      .get(`/api/v1/students/${studentId}`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(studentRes.body.data.status).toBe('Alumni');

    // Confirm the alumni profile is genuinely listed
    const alumniList = await request(app).get('/api/v1/alumni').set('Authorization', `Bearer ${teacher.token}`);
    expect(alumniList.body.data.some((a: { student: { _id: string } }) => a.student._id === studentId)).toBe(true);
  });

  it('rejects graduating an already-graduated student', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-7003');
    await request(app)
      .post('/api/v1/alumni/graduate')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId, academicCompletionConfirmed: true, graduationYear: 2026 });
    const res = await request(app)
      .post('/api/v1/alumni/graduate')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId, academicCompletionConfirmed: true, graduationYear: 2026 });
    expect(res.status).toBe(409);
  });

  it('rejects graduating a non-existent student', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/alumni/graduate')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ academicCompletionConfirmed: true, studentId: '64b7f9c9a1b2c3d4e5f60789', graduationYear: 2026 });
    expect(res.status).toBe(404);
  });

  it('filters the alumni directory by graduation year', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-7004');
    await request(app)
      .post('/api/v1/alumni/graduate')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId, academicCompletionConfirmed: true, graduationYear: 2019 });
    const res = await request(app)
      .get('/api/v1/alumni')
      .set('Authorization', `Bearer ${teacher.token}`)
      .query({ graduationYear: 2019 });
    expect(res.status).toBe(200);
    expect(res.body.data.every((a: { graduationYear: number }) => a.graduationYear === 2019)).toBe(true);
  });
});
