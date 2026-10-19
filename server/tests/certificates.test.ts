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
  if (guardianUserId)
    token = (await registerAndLogin('Administrator', 'qa-cert-link-' + refId.toLowerCase() + '@example.invalid')).token;
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

describe('Certificates API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/certificates');
    expect(res.status).toBe(401);
  });

  it('rejects issuance by a Parent', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-5001');
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/certificates')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ studentId, type: 'Transfer' });
    expect(res.status).toBe(403);
  });

  it('does not issue a certificate or allocate a reference for a missing student', async () => {
    const admin = await registerAndLogin('Administrator', 'cert-missing-student@alnoor.ae');
    const missing = await request(app)
      .post('/api/v1/certificates')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ studentId: '507f1f77bcf86cd799439011', type: 'Bonafide' });
    expect(missing.status).toBe(404);
    const studentId = await createStudent(admin.token, 'ANS-CERT-AFTER-MISSING');
    const issued = await request(app)
      .post('/api/v1/certificates')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ studentId, type: 'Bonafide' });
    expect(issued.status).toBe(201);
    expect(issued.body.data.certNumber).toMatch(/-0001$/);
  });

  it('issues a certificate with a correctly formatted, sequential number starting at 1', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const studentId = await createStudent(teacher.token, 'ANS-5002');
    const res = await request(app)
      .post('/api/v1/certificates')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId, type: 'Bonafide', purpose: 'Visa application' });
    expect(res.status).toBe(201);
    expect(res.body.data.certNumber).toMatch(/^BF-\d{4}-0001$/);
  });

  it('preserves the existing Report Card and Provisional choices as distinct certificate types', async () => {
    const admin = await registerAndLogin('Administrator', 'certificate-types@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-5002-TYPES');
    for (const [type, prefix] of [
      ['ReportCard', 'RC'],
      ['Provisional', 'PC'],
    ] as const) {
      const issued = await request(app)
        .post('/api/v1/certificates')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ studentId, type });
      expect(issued.status).toBe(201);
      expect(issued.body.data.type).toBe(type);
      expect(issued.body.data.certNumber).toMatch(new RegExp(`^${prefix}-\\d{4}-0001$`));
    }
    const listed = await request(app).get('/api/v1/certificates').set('Authorization', `Bearer ${admin.token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.map((item: { type: string }) => item.type)).toEqual(
      expect.arrayContaining(['ReportCard', 'Provisional']),
    );
  });

  it('persists pending requests, limits decisions to office roles, and hides drafts from families', async () => {
    const admin = await registerAndLogin('Administrator', 'cert-approver@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'cert-family@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-CERT-APPROVAL', parent.userId);
    const requested = await request(app)
      .post('/api/v1/certificates')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ studentId, type: 'Bonafide', status: 'Pending', purpose: 'School transfer file' });
    expect(requested.status).toBe(201);
    expect(requested.body.data.status).toBe('Pending');
    expect(requested.body.data.certNumber).toMatch(/^REQ-[A-F0-9]{12}$/);

    const familyBefore = await request(app).get('/api/v1/certificates').set('Authorization', `Bearer ${parent.token}`);
    expect(familyBefore.body.data).toHaveLength(0);
    const familyDecision = await request(app)
      .post(`/api/v1/certificates/${requested.body.data._id}/decision`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ decision: 'Issued' });
    expect(familyDecision.status).toBe(403);

    const approved = await request(app)
      .post(`/api/v1/certificates/${requested.body.data._id}/decision`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ decision: 'Issued' });
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe('Issued');
    expect(approved.body.data.certNumber).toMatch(/^BF-\d{4}-0001$/);
    const repeated = await request(app)
      .post(`/api/v1/certificates/${requested.body.data._id}/decision`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ decision: 'Issued' });
    expect(repeated.status).toBe(409);
    const familyAfter = await request(app).get('/api/v1/certificates').set('Authorization', `Bearer ${parent.token}`);
    expect(familyAfter.body.data).toHaveLength(1);

    const second = await request(app)
      .post('/api/v1/certificates')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ studentId, type: 'Character', status: 'Pending' });
    const rejected = await request(app)
      .post(`/api/v1/certificates/${second.body.data._id}/decision`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ decision: 'Rejected' });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.status).toBe('Rejected');
    const familyFinal = await request(app).get('/api/v1/certificates').set('Authorization', `Bearer ${parent.token}`);
    expect(familyFinal.body.data).toHaveLength(1);
  });

  it('issues consecutive, non-colliding sequence numbers for the SAME type in sequence', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const s1 = await createStudent(teacher.token, 'ANS-5003');
    const s2 = await createStudent(teacher.token, 'ANS-5004');
    const cert1 = await request(app)
      .post('/api/v1/certificates')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId: s1, type: 'Character' });
    const cert2 = await request(app)
      .post('/api/v1/certificates')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId: s2, type: 'Character' });
    const num1 = parseInt(cert1.body.data.certNumber.split('-')[2], 10);
    const num2 = parseInt(cert2.body.data.certNumber.split('-')[2], 10);
    expect(num2).toBe(num1 + 1);
  });

  it('CONCURRENCY: 10 simultaneous certificate issuances for the same type produce 10 genuinely unique sequence numbers, never a collision', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const studentIds = await Promise.all(
      Array.from({ length: 10 }, (_, i) => createStudent(teacher.token, `ANS-51${10 + i}`)),
    );

    const results = await Promise.all(
      studentIds.map((studentId) =>
        request(app)
          .post('/api/v1/certificates')
          .set('Authorization', `Bearer ${teacher.token}`)
          .send({ studentId, type: 'Study' }),
      ),
    );
    expect(results.every((r) => r.status === 201)).toBe(true);

    const certNumbers = results.map((r) => r.body.data.certNumber);
    const uniqueCertNumbers = new Set(certNumbers);
    expect(uniqueCertNumbers.size).toBe(10); // all 10 genuinely distinct - the actual property the atomic $inc exists to guarantee
  });

  it('a different certificate TYPE starts its own sequence at 1, independent of other types', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    const s1 = await createStudent(teacher.token, 'ANS-5020');
    // Issue several Bonafide certs first to advance that counter
    for (let i = 0; i < 3; i++) {
      const s = await createStudent(teacher.token, `ANS-502${i + 1}`);
      await request(app)
        .post('/api/v1/certificates')
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({ studentId: s, type: 'Bonafide' });
    }
    // Now issue the FIRST EVER Transfer certificate - should still be 0001, unaffected by Bonafide's count
    const res = await request(app)
      .post('/api/v1/certificates')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId: s1, type: 'Transfer' });
    expect(res.body.data.certNumber).toMatch(/^TC-\d{4}-0001$/);
  });

  it('a Parent sees only certificates for their linked child', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher5@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent2@alnoor.ae');
    const myChildId = await createStudent(teacher.token, 'ANS-5030', parent.userId);
    const otherChildId = await createStudent(teacher.token, 'ANS-5031');
    await request(app)
      .post('/api/v1/certificates')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId: myChildId, type: 'Bonafide' });
    await request(app)
      .post('/api/v1/certificates')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId: otherChildId, type: 'Bonafide' });

    const res = await request(app).get('/api/v1/certificates').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });
});
