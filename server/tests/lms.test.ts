import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Student' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
}

async function createStudent(
  token: string,
  refId: string,
  options?: { studentUserId?: string; guardianUserId?: string },
) {
  const res = await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send({
    refId,
    name: 'Fatima Al Hashimi',
    grade: 'Grade 10 · A',
    gender: 'Female',
    roll: '12',
    guardianName: 'Khalid',
    studentUserId: options?.studentUserId,
    guardianUserId: options?.guardianUserId,
    phone: '+971501234567',
  });
  return res.body.data._id as string;
}

async function createAssignment(token: string, dueDate: string) {
  const res = await request(app).post('/api/v1/lms/assignments').set('Authorization', `Bearer ${token}`).send({
    title: 'Algebra Homework',
    description: 'Exercises 1-10',
    subject: 'Mathematics',
    grade: 'Grade 10 · A',
    dueDate,
    maxScore: 100,
  });
  return res.body.data._id as string;
}

describe('LMS API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/lms/assignments');
    expect(res.status).toBe(401);
  });

  it('rejects assignment creation by a Student', async () => {
    const student = await registerAndLogin('Student', 'student1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/lms/assignments')
      .set('Authorization', `Bearer ${student.token}`)
      .send({ title: 'X', description: 'x', subject: 'Math', grade: 'G10', dueDate: '2026-06-20', maxScore: 100 });
    expect(res.status).toBe(403);
  });

  it('rejects submission by a Student with NO linked student record', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const assignmentId = await createAssignment(admin.token, '2099-01-01');
    const student = await registerAndLogin('Student', 'student2@alnoor.ae');
    const res = await request(app)
      .post(`/api/v1/lms/assignments/${assignmentId}/submit`)
      .set('Authorization', `Bearer ${student.token}`)
      .send({ content: 'My answer' });
    expect(res.status).toBe(400);
  });

  it("rejects submission by a Teacher or Administrator - ONLY Student may submit, even on a student's behalf", async () => {
    const admin = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    const assignmentId = await createAssignment(admin.token, '2099-01-01');
    const res = await request(app)
      .post(`/api/v1/lms/assignments/${assignmentId}/submit`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ content: 'On behalf of a student' });
    expect(res.status).toBe(403);
  });

  it('allows a linked Student to submit an assignment ON TIME', async () => {
    const admin = await registerAndLogin('Administrator', 'admin3@alnoor.ae');
    const student = await registerAndLogin('Student', 'student3@alnoor.ae');
    await createStudent(admin.token, 'ANS-6001', { studentUserId: student.userId });
    const assignmentId = await createAssignment(admin.token, '2099-01-01'); // far future - definitely on time
    const res = await request(app)
      .post(`/api/v1/lms/assignments/${assignmentId}/submit`)
      .set('Authorization', `Bearer ${student.token}`)
      .send({ content: 'My completed answer' });
    expect(res.status).toBe(201);
    expect(res.body.data.isLate).toBe(false);
  });

  it('THE LATE DETECTION, PROVEN END TO END: a submission after the due date is correctly flagged isLate', async () => {
    const admin = await registerAndLogin('Administrator', 'admin4@alnoor.ae');
    const student = await registerAndLogin('Student', 'student4@alnoor.ae');
    await createStudent(admin.token, 'ANS-6002', { studentUserId: student.userId });
    const assignmentId = await createAssignment(admin.token, '2020-01-01'); // definitely in the past
    const res = await request(app)
      .post(`/api/v1/lms/assignments/${assignmentId}/submit`)
      .set('Authorization', `Bearer ${student.token}`)
      .send({ content: 'A late answer' });
    expect(res.status).toBe(201);
    expect(res.body.data.isLate).toBe(true);
  });

  it('rejects a second submission from the same student for the same assignment', async () => {
    const admin = await registerAndLogin('Administrator', 'admin5@alnoor.ae');
    const student = await registerAndLogin('Student', 'student5@alnoor.ae');
    await createStudent(admin.token, 'ANS-6003', { studentUserId: student.userId });
    const assignmentId = await createAssignment(admin.token, '2099-01-01');
    await request(app)
      .post(`/api/v1/lms/assignments/${assignmentId}/submit`)
      .set('Authorization', `Bearer ${student.token}`)
      .send({ content: 'First attempt' });
    const res = await request(app)
      .post(`/api/v1/lms/assignments/${assignmentId}/submit`)
      .set('Authorization', `Bearer ${student.token}`)
      .send({ content: 'Second attempt' });
    expect(res.status).toBe(409);
  });

  it('rejects grading with a score exceeding the assignment maxScore', async () => {
    const admin = await registerAndLogin('Administrator', 'admin6@alnoor.ae');
    const student = await registerAndLogin('Student', 'student6@alnoor.ae');
    await createStudent(admin.token, 'ANS-6004', { studentUserId: student.userId });
    const assignmentId = await createAssignment(admin.token, '2099-01-01');
    const submission = await request(app)
      .post(`/api/v1/lms/assignments/${assignmentId}/submit`)
      .set('Authorization', `Bearer ${student.token}`)
      .send({ content: 'My answer' });
    const res = await request(app)
      .post(`/api/v1/lms/submissions/${submission.body.data._id}/grade`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ score: 150, expectedUpdatedAt: submission.body.data.updatedAt, reason: 'Reviewed coursework' });
    expect(res.status).toBe(400);
  });

  it('grades a submission within range successfully', async () => {
    const admin = await registerAndLogin('Administrator', 'admin7@alnoor.ae');
    const student = await registerAndLogin('Student', 'student7@alnoor.ae');
    await createStudent(admin.token, 'ANS-6005', { studentUserId: student.userId });
    const assignmentId = await createAssignment(admin.token, '2099-01-01');
    const submission = await request(app)
      .post(`/api/v1/lms/assignments/${assignmentId}/submit`)
      .set('Authorization', `Bearer ${student.token}`)
      .send({ content: 'My answer' });
    const res = await request(app)
      .post(`/api/v1/lms/submissions/${submission.body.data._id}/grade`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        score: 85,
        feedback: 'Good work',
        expectedUpdatedAt: submission.body.data.updatedAt,
        reason: 'Reviewed coursework',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Graded');
  });

  it("THE DUAL-RELATIONSHIP PROOF: a Student sees only their OWN submission, and a Parent sees only their CHILD'S - the same scoping function, two different relationships", async () => {
    const admin = await registerAndLogin('Administrator', 'admin8@alnoor.ae');
    const studentA = await registerAndLogin('Student', 'studentA@alnoor.ae');
    const studentB = await registerAndLogin('Student', 'studentB@alnoor.ae');
    const parentOfA = await registerAndLogin('Parent', 'parentA@alnoor.ae');
    // both relationships set directly at creation - both fields are genuinely independent on the
    // same Student document, no PATCH or lookup indirection needed
    await createStudent(admin.token, 'ANS-6006', { studentUserId: studentA.userId, guardianUserId: parentOfA.userId });
    await createStudent(admin.token, 'ANS-6007', { studentUserId: studentB.userId });

    const assignmentId = await createAssignment(admin.token, '2099-01-01');
    await request(app)
      .post(`/api/v1/lms/assignments/${assignmentId}/submit`)
      .set('Authorization', `Bearer ${studentA.token}`)
      .send({ content: 'A' });
    await request(app)
      .post(`/api/v1/lms/assignments/${assignmentId}/submit`)
      .set('Authorization', `Bearer ${studentB.token}`)
      .send({ content: 'B' });

    const studentAView = await request(app)
      .get('/api/v1/lms/submissions')
      .set('Authorization', `Bearer ${studentA.token}`);
    expect(studentAView.body.data.length).toBe(1); // sees only their own, not studentB's

    const parentView = await request(app)
      .get('/api/v1/lms/submissions')
      .set('Authorization', `Bearer ${parentOfA.token}`);
    expect(parentView.body.data.length).toBe(1); // sees only their child's, via a DIFFERENT relationship field, same result shape
  });
});

describe('LMS course persistence', () => {
  it('persists a created course across independent list requests', async () => {
    const admin = await registerAndLogin('Administrator', 'course-admin@example.invalid');
    const course = { title: 'Persistent course', teacher: 'QA Teacher', grade: '10-A', startDate: '2030-12-01' };
    const created = await request(app)
      .post('/api/v1/lms/courses')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(course);
    expect(created.status).toBe(201);
    for (let i = 0; i < 2; i++) {
      const listed = await request(app)
        .get('/api/v1/lms/courses?limit=100')
        .set('Authorization', `Bearer ${admin.token}`);
      expect(listed.status).toBe(200);
      expect(listed.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ _id: created.body.data._id, title: course.title, grade: course.grade }),
        ]),
      );
    }
  });
  it('rejects unauthenticated reads, Student creation and invalid course payloads', async () => {
    expect((await request(app).get('/api/v1/lms/courses')).status).toBe(401);
    const student = await registerAndLogin('Student', 'course-student@example.invalid');
    expect(
      (
        await request(app)
          .post('/api/v1/lms/courses')
          .set('Authorization', `Bearer ${student.token}`)
          .send({ title: 'Course', teacher: 'QA', grade: '10-A' })
      ).status,
    ).toBe(403);
    const admin = await registerAndLogin('Administrator', 'course-invalid@example.invalid');
    expect(
      (
        await request(app)
          .post('/api/v1/lms/courses')
          .set('Authorization', `Bearer ${admin.token}`)
          .send({ title: '', teacher: 'QA', grade: '10-A' })
      ).status,
    ).toBe(400);
  });
});
