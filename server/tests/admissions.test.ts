import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string };
}

const validApplication = {
  applicantName: 'Omar Al Farsi',
  gradeAppliedFor: 'Grade 7 · A',
  gender: 'Male',
  guardianName: 'Yusuf Al Farsi',
  phone: '+971501234567',
};

async function createApplication(token: string) {
  const res = await request(app)
    .post('/api/v1/admissions')
    .set('Authorization', `Bearer ${token}`)
    .send(validApplication);
  return res.body.data._id as string;
}

async function transitionTo(token: string, id: string, status: string) {
  if (status === 'Accepted') {
    await Promise.all(['id', 'birth', 'photo'].map((key) => request(app)
      .post(`/api/v1/admissions/${id}/documents/${key}/mark-received`)
      .set('Authorization', `Bearer ${token}`)));
  }
  return request(app)
    .post(`/api/v1/admissions/${id}/transition`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status });
}

describe('Admissions API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/admissions');
    expect(res.status).toBe(401);
  });

  it('rejects a Parent from even reading the pipeline - whole-module gate like Visitors', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app).get('/api/v1/admissions').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(403);
  });

  it('walks the full pipeline Applied -> Shortlisted -> Interviewed -> Accepted', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const id = await createApplication(admin.token);
    expect((await transitionTo(admin.token, id, 'Shortlisted')).status).toBe(200);
    expect((await transitionTo(admin.token, id, 'Interviewed')).status).toBe(200);
    const accepted = await transitionTo(admin.token, id, 'Accepted');
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.status).toBe('Accepted');
  });

  it('rejects skipping stages (Applied straight to Accepted)', async () => {
    const admin = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    const id = await createApplication(admin.token);
    const res = await transitionTo(admin.token, id, 'Accepted');
    expect(res.status).toBe(400);
  });

  it('allows early rejection straight from Applied - the branch', async () => {
    const admin = await registerAndLogin('Administrator', 'admin3@alnoor.ae');
    const id = await createApplication(admin.token);
    const res = await transitionTo(admin.token, id, 'Rejected');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Rejected');
  });

  it('keeps a rejected decision auditable and supports the existing UI restore action', async () => {
    const admin = await registerAndLogin('Administrator', 'admin4@alnoor.ae');
    const id = await createApplication(admin.token);
    await transitionTo(admin.token, id, 'Rejected');
    const res = await transitionTo(admin.token, id, 'Shortlisted');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Shortlisted');
    expect(res.body.data.history).toHaveLength(2);
  });

  it('supports the existing waitlist and restore workflow without losing the prior stage', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-waitlist@alnoor.ae');
    const id = await createApplication(admin.token);
    await transitionTo(admin.token, id, 'Shortlisted');
    const waitlisted = await transitionTo(admin.token, id, 'Waitlisted');
    expect(waitlisted.status).toBe(200);
    expect(waitlisted.body.data.previousStatus).toBe('Shortlisted');
    const restored = await transitionTo(admin.token, id, 'Shortlisted');
    expect(restored.status).toBe(200);
    expect(restored.body.data.status).toBe('Shortlisted');
  });

  it('blocks issuing an offer until the three required documents are received', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-docs@alnoor.ae');
    const id = await createApplication(admin.token);
    await transitionTo(admin.token, id, 'Shortlisted');
    await transitionTo(admin.token, id, 'Interviewed');
    const res = await request(app).post(`/api/v1/admissions/${id}/transition`).set('Authorization', `Bearer ${admin.token}`).send({ status: 'Accepted' });
    expect(res.status).toBe(400);
  });

  it('securely stores, reads, and removes an admission document', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-upload@alnoor.ae');
    const id = await createApplication(admin.token);
    const upload = await request(app).put(`/api/v1/admissions/${id}/documents/id`).set('Authorization', `Bearer ${admin.token}`).set('Content-Type', 'application/pdf').set('X-File-Name', encodeURIComponent('passport.pdf')).send(Buffer.from('%PDF admission'));
    expect(upload.status).toBe(201);
    const download = await request(app).get(`/api/v1/admissions/${id}/documents/id`).set('Authorization', `Bearer ${admin.token}`);
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toContain('application/pdf');
    const remove = await request(app).delete(`/api/v1/admissions/${id}/documents/id`).set('Authorization', `Bearer ${admin.token}`);
    expect(remove.status).toBe(200);
  });

  it('rejects enrolling a not-yet-Accepted application', async () => {
    const admin = await registerAndLogin('Administrator', 'admin5@alnoor.ae');
    const id = await createApplication(admin.token);
    const res = await request(app)
      .post(`/api/v1/admissions/${id}/enroll`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'ANS-5001', roll: '31' });
    expect(res.status).toBe(400);
  });

  it('THE ENROLLMENT TRANSACTION, PROVEN BOTH SIDES: enrolling an Accepted application creates a REAL Student carrying the application data, and the application links back to it', async () => {
    const admin = await registerAndLogin('Administrator', 'admin6@alnoor.ae');
    const id = await createApplication(admin.token);
    await transitionTo(admin.token, id, 'Shortlisted');
    await transitionTo(admin.token, id, 'Interviewed');
    await transitionTo(admin.token, id, 'Accepted');

    const enrolled = await request(app)
      .post(`/api/v1/admissions/${id}/enroll`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'ANS-5002', roll: '31' });
    expect(enrolled.status).toBe(200);
    expect(enrolled.body.data.status).toBe('Enrolled');
    expect(enrolled.body.data.enrolledStudent).toBeDefined();

    // Confirm the Student genuinely exists in the Students module with the application's own data
    const studentRes = await request(app)
      .get(`/api/v1/students/${enrolled.body.data.enrolledStudent}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(studentRes.status).toBe(200);
    expect(studentRes.body.data.name).toBe('Omar Al Farsi');
    expect(studentRes.body.data.grade).toBe('Grade 7 · A');
    expect(studentRes.body.data.refId).toBe('ANS-5002');
  });

  it('enrolling with a refId that already exists gets a real 409, and the application stays Accepted (transaction rolled back, not half-applied)', async () => {
    const admin = await registerAndLogin('Administrator', 'admin7@alnoor.ae');
    const firstId = await createApplication(admin.token);
    await transitionTo(admin.token, firstId, 'Shortlisted');
    await transitionTo(admin.token, firstId, 'Interviewed');
    await transitionTo(admin.token, firstId, 'Accepted');
    await request(app)
      .post(`/api/v1/admissions/${firstId}/enroll`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'ANS-5003', roll: '32' });

    const secondId = await createApplication(admin.token);
    await transitionTo(admin.token, secondId, 'Shortlisted');
    await transitionTo(admin.token, secondId, 'Interviewed');
    await transitionTo(admin.token, secondId, 'Accepted');
    const res = await request(app)
      .post(`/api/v1/admissions/${secondId}/enroll`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'ANS-5003', roll: '33' });
    expect(res.status).toBe(409);

    // the failed enrollment must NOT have half-applied - the application is still Accepted, not Enrolled
    const check = await request(app)
      .get('/api/v1/admissions')
      .set('Authorization', `Bearer ${admin.token}`)
      .query({ status: 'Accepted' });
    expect(check.body.data.some((a: { _id: string }) => a._id === secondId)).toBe(true);
  });
});
