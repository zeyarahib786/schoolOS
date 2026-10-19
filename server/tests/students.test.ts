import request from 'supertest';
import { createApp } from '../src/app';
import { Student } from '../src/models/Student';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return res.body.data.accessToken as string;
}

const validStudent = {
  refId: 'ANS-9001',
  name: 'Fatima Al Hashimi',
  grade: 'Grade 10 · A',
  gender: 'Female',
  roll: '12',
  guardianName: 'Khalid Al Hashimi',
  phone: '+971501234567',
  feeStatus: 'Paid',
  attendancePct: 96,
  gpa: 3.8,
  status: 'Active',
};

describe('Students API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/students');
    expect(res.status).toBe(401);
  });

  it('rejects student creation by a Parent role (RBAC enforced server-side)', async () => {
    const token = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send(validStudent);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows student creation by a Teacher (write role)', async () => {
    const token = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const res = await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send(validStudent);
    expect(res.status).toBe(201);
    expect(res.body.data.refId).toBe('ANS-9001');
  });

  it('shows a Student account only its linked record on the Dashboard roster', async () => {
    const admin = await registerAndLogin('Administrator', 'student-dashboard-admin@alnoor.ae');
    const own = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin}`)
      .send({ ...validStudent, refId: 'ANS-SELF-1' });
    const other = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${admin}`)
      .send({ ...validStudent, refId: 'ANS-OTHER-1' });
    expect(own.status).toBe(201);
    expect(other.status).toBe(201);
    const account = await request(app).post('/api/v1/auth/register').send({
      name: 'Linked Student',
      email: 'linked-student@alnoor.ae',
      password: 'StrongPass123',
      role: 'Student',
    });
    expect(account.status).toBe(201);
    const token = account.body.data.accessToken as string;
    const beforeLink = await request(app).get('/api/v1/students').set('Authorization', `Bearer ${token}`);
    expect(beforeLink.status).toBe(200);
    expect(beforeLink.body.data).toHaveLength(0);
    await Student.updateOne({ _id: own.body.data._id }, { $set: { studentUserId: account.body.data.user._id } });
    const roster = await request(app).get('/api/v1/students').set('Authorization', `Bearer ${token}`);
    expect(roster.status).toBe(200);
    expect(roster.body.data.map((row: { refId: string }) => row.refId)).toEqual(['ANS-SELF-1']);
    expect(
      (await request(app).get(`/api/v1/students/${own.body.data._id}`).set('Authorization', `Bearer ${token}`)).status,
    ).toBe(200);
    expect(
      (await request(app).get(`/api/v1/students/${other.body.data._id}`).set('Authorization', `Bearer ${token}`))
        .status,
    ).toBe(404);
  });

  it('persists the existing full student intake fields', async () => {
    const token = await registerAndLogin('Administrator', 'student-intake@alnoor.ae');
    const intake = {
      ...validStudent,
      dateOfBirth: '2012-04-12',
      nationality: 'UAE',
      guardianRelationship: 'Father',
      guardianEmail: 'guardian@example.com',
      emergencyContact: '+971501112222',
      preferredLanguage: 'English',
      address: 'Dubai',
      previousSchool: 'Previous School',
      previousGrade: 'Grade 8',
      languages: 'English, Arabic',
      bloodGroup: 'O+',
      allergies: 'None known',
      medicalNotes: 'None',
      transportRequirement: 'Two-way',
    };
    const created = await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send(intake);
    expect(created.status).toBe(201);
    const fetched = await request(app)
      .get(`/api/v1/students/${created.body.data._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data).toMatchObject({
      nationality: 'UAE',
      guardianRelationship: 'Father',
      guardianEmail: 'guardian@example.com',
      emergencyContact: '+971501112222',
      preferredLanguage: 'English',
      address: 'Dubai',
      previousSchool: 'Previous School',
      previousGrade: 'Grade 8',
      languages: 'English, Arabic',
      bloodGroup: 'O+',
      allergies: 'None known',
      medicalNotes: 'None',
      transportRequirement: 'Two-way',
    });
    expect(String(fetched.body.data.dateOfBirth)).toContain('2012-04-12');
  });

  it('derives the Students summary from linked attendance, invoices, and assessment results', async () => {
    const token = await registerAndLogin('Administrator', 'student-live-summary@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validStudent, refId: 'ANS-9050', attendancePct: 99, feeStatus: 'Paid', gpa: 4 });
    const id = created.body.data._id;
    await request(app)
      .post('/api/v1/attendance/mark')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2026-04-01',
        session: 'AM',
        entries: [{ studentId: id, status: 'Present' }],
      });
    await request(app)
      .post('/api/v1/attendance/mark')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2026-04-01',
        session: 'PM',
        entries: [{ studentId: id, status: 'Absent' }],
      });
    await request(app).post('/api/v1/fees').set('Authorization', `Bearer ${token}`).send({
      refId: 'INV-9050',
      studentId: id,
      term: 'Term 1',
      amount: 1000,
      dueDate: '2026-05-01',
      currency: 'AED',
    });
    const exam = await request(app)
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Student summary test',
        term: 'Term 1',
        subjects: ['Math', 'English'],
        maxMarks: 100,
        passMark: 50,
      });
    await request(app)
      .post('/api/v1/exams/results')
      .set('Authorization', `Bearer ${token}`)
      .send({
        examId: exam.body.data._id,
        studentId: id,
        scores: [
          { subject: 'Math', marks: 75 },
          { subject: 'English', marks: 75 },
        ],
      });
    const fetched = await request(app).get(`/api/v1/students/${id}`).set('Authorization', `Bearer ${token}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data).toMatchObject({
      attendancePct: 50,
      feeStatus: 'Pending',
      gpa: 3,
      attendanceRecords: 2,
      assessmentResults: 1,
      invoiceRecords: 1,
    });
    const deleted = await request(app).delete(`/api/v1/students/${id}`).set('Authorization', `Bearer ${token}`);
    expect(deleted.status).toBe(409);
  });

  it('securely uploads, downloads, replaces, and deletes a student document', async () => {
    const token = await registerAndLogin('Administrator', 'student-docs@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${token}`)
      .send(validStudent);
    const id = created.body.data._id;
    const path = `/api/v1/students/${id}/documents/birth`;
    const first = Buffer.from('first protected document');
    const uploaded = await request(app)
      .put(path)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/pdf')
      .set('X-File-Name', encodeURIComponent('birth certificate.pdf'))
      .send(first);
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.data).toMatchObject({ key: 'birth', filename: 'birth certificate.pdf', size: first.length });

    const fetchedStudent = await request(app).get(`/api/v1/students/${id}`).set('Authorization', `Bearer ${token}`);
    expect(fetchedStudent.body.data.documents).toHaveLength(1);
    const downloaded = await request(app).get(path).set('Authorization', `Bearer ${token}`).buffer(true);
    expect(downloaded.status).toBe(200);
    expect(Buffer.from(downloaded.body).equals(first)).toBe(true);

    const replacement = Buffer.from('replacement');
    expect(
      (
        await request(app)
          .put(path)
          .set('Authorization', `Bearer ${token}`)
          .set('Content-Type', 'application/pdf')
          .set('X-File-Name', 'replacement.pdf')
          .send(replacement)
      ).status,
    ).toBe(201);
    const afterReplace = await request(app).get(`/api/v1/students/${id}`).set('Authorization', `Bearer ${token}`);
    expect(afterReplace.body.data.documents).toHaveLength(1);
    expect(afterReplace.body.data.documents[0].filename).toBe('replacement.pdf');

    expect((await request(app).delete(path).set('Authorization', `Bearer ${token}`)).status).toBe(200);
    expect((await request(app).get(path).set('Authorization', `Bearer ${token}`)).status).toBe(404);
  });

  it('rejects unsupported or invalid student document requests', async () => {
    const token = await registerAndLogin('Administrator', 'student-doc-errors@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${token}`)
      .send(validStudent);
    const base = `/api/v1/students/${created.body.data._id}/documents`;
    expect(
      (
        await request(app)
          .put(`${base}/unknown`)
          .set('Authorization', `Bearer ${token}`)
          .set('Content-Type', 'application/pdf')
          .send(Buffer.from('x'))
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .put(`${base}/photo`)
          .set('Authorization', `Bearer ${token}`)
          .set('Content-Type', 'text/plain')
          .send('not allowed')
      ).status,
    ).toBe(400);
  });

  it('rejects a duplicate refId with 409', async () => {
    const token = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send(validStudent);
    const res = await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send(validStudent);
    expect(res.status).toBe(409);
  });

  it('rejects invalid phone number format with 400', async () => {
    const token = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validStudent, refId: 'ANS-9002', phone: 'not-a-phone' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lists students with pagination metadata', async () => {
    const token = await registerAndLogin('Administrator', 'admin3@alnoor.ae');
    await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send(validStudent);
    const res = await request(app).get('/api/v1/students?page=1&limit=10').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.pagination.total).toBe(1);
  });

  it('a Parent (read-only role) CAN read the list', async () => {
    const adminToken = await registerAndLogin('Administrator', 'admin4@alnoor.ae');
    await request(app).post('/api/v1/students').set('Authorization', `Bearer ${adminToken}`).send(validStudent);
    const parentToken = await registerAndLogin('Parent', 'parent2@alnoor.ae');
    const res = await request(app).get('/api/v1/students').set('Authorization', `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
  });

  it('returns 404 for a well-formed but non-existent id', async () => {
    const token = await registerAndLogin('Administrator', 'admin5@alnoor.ae');
    const res = await request(app)
      .get('/api/v1/students/64b7f9c9a1b2c3d4e5f60789')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('rejects a malformed id with 400 (not a 500)', async () => {
    const token = await registerAndLogin('Administrator', 'admin6@alnoor.ae');
    const res = await request(app).get('/api/v1/students/not-a-valid-id').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('updates a student and reflects the change', async () => {
    const token = await registerAndLogin('Administrator', 'admin7@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${token}`)
      .send(validStudent);
    const res = await request(app)
      .patch(`/api/v1/students/${created.body.data._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ feeStatus: 'Overdue' });
    expect(res.status).toBe(200);
    expect(res.body.data.feeStatus).toBe('Overdue');
  });

  it('searches by partial name or reference without treating user text as regex', async () => {
    const token = await registerAndLogin('Administrator', 'student-search@alnoor.ae');
    await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send(validStudent);
    for (const term of ['fatima', '9001']) {
      const res = await request(app)
        .get('/api/v1/students')
        .query({ search: term })
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.map((student: { refId: string }) => student.refId)).toContain('ANS-9001');
    }
    const literal = await request(app)
      .get('/api/v1/students')
      .query({ search: '.*' })
      .set('Authorization', `Bearer ${token}`);
    expect(literal.status).toBe(200);
    expect(literal.body.meta.pagination.total).toBe(0);
  });

  it('rejects changing a reference to another student reference with 409', async () => {
    const token = await registerAndLogin('Administrator', 'student-ref-edit@alnoor.ae');
    const first = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${token}`)
      .send(validStudent);
    const second = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validStudent, refId: 'ANS-9002' });
    const res = await request(app)
      .patch(`/api/v1/students/${second.body.data._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ refId: first.body.data.refId });
    expect(res.status).toBe(409);
    const stillSecond = await request(app)
      .get(`/api/v1/students/${second.body.data._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(stillSecond.body.data.refId).toBe('ANS-9002');
  });

  it('records server-authored create, update, and delete events for the actual actor', async () => {
    const token = await registerAndLogin('Administrator', 'student-audit@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${token}`)
      .send(validStudent);
    expect(created.status).toBe(201);
    const id = created.body.data._id;
    expect(
      (
        await request(app)
          .patch(`/api/v1/students/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ guardianName: 'Updated Guardian' })
      ).status,
    ).toBe(200);
    expect((await request(app).delete(`/api/v1/students/${id}`).set('Authorization', `Bearer ${token}`)).status).toBe(
      200,
    );
    const logs = await request(app).get('/api/v1/audit-log?module=Students').set('Authorization', `Bearer ${token}`);
    expect(logs.status).toBe(200);
    expect(logs.body.data.map((entry: { action: string }) => entry.action)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Created student ANS-9001'),
        expect.stringContaining('Updated student ANS-9001'),
        expect.stringContaining('Deleted student ANS-9001'),
      ]),
    );
    expect(
      logs.body.data.every(
        (entry: { performedBy: { email: string } }) => entry.performedBy.email === 'student-audit@alnoor.ae',
      ),
    ).toBe(true);
  });

  it('only Administrator/Principal can delete (Teacher is rejected)', async () => {
    const adminToken = await registerAndLogin('Administrator', 'admin8@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validStudent);
    const teacherToken = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const res = await request(app)
      .delete(`/api/v1/students/${created.body.data._id}`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.status).toBe(403);
  });

  it('rejects NoSQL-injection-style query operators instead of matching everything', async () => {
    const token = await registerAndLogin('Administrator', 'admin9@alnoor.ae');
    await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send(validStudent);
    const res = await request(app)
      .get('/api/v1/students')
      .query({ grade: { $ne: null } })
      .set('Authorization', `Bearer ${token}`);
    // The validated API contract accepts grade as a scalar string only. Rejecting an injected
    // object is safe and avoids depending on middleware-specific mutation semantics.
    expect(res.status).toBe(400);
  });

  it('accepts and persists guardianUserId on creation - regression test for a real bug found while building Attendance: the field existed on the Mongoose model (added for ownership scoping) but was missing from the Zod schema, so the API silently stripped it and no student could ever actually be linked to a guardian through a real request', async () => {
    const token = await registerAndLogin('Administrator', 'admin10@alnoor.ae');
    const guardian = await request(app).post('/api/v1/auth/register').send({
      name: 'Linked Guardian',
      email: 'valid-guardian@example.invalid',
      password: 'StrongPass123',
      role: 'Parent',
    });
    expect(guardian.status).toBe(201);
    const guardianUserId = guardian.body.data.user._id;
    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validStudent, refId: 'ANS-9010', guardianUserId });
    expect(res.status).toBe(201);
    expect(res.body.data.guardianUserId).toBe(guardianUserId);
  });
});
