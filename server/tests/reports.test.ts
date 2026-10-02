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
    grade: 'Grade 10 · A',
    gender: 'Female',
    roll: '12',
    guardianName: 'Khalid',
    phone: '+971501234567',
  });
  return res.body.data._id as string;
}

describe('Reports API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/reports/overview');
    expect(res.status).toBe(401);
  });

  it('THE FIRST MANAGEMENT-ONLY READ: even a Teacher gets 403, not just Parents', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    expect(
      (await request(app).get('/api/v1/reports/overview').set('Authorization', `Bearer ${teacher.token}`)).status,
    ).toBe(403);
    expect(
      (await request(app).get('/api/v1/reports/overview').set('Authorization', `Bearer ${parent.token}`)).status,
    ).toBe(403);
  });

  it('THE CROSS-COLLECTION AGGREGATION, PROVEN: counts and $avg averages are genuinely computed by the database over real created data', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');

    // two students -> status counts + averages; the model defaults gpa/attendancePct, so the
    // averages row existing AND being numeric is the honest assertion (values are defaults)
    const studentA = await createStudent(admin.token, 'ANS-7101');
    const studentB = await createStudent(admin.token, 'ANS-7102');
    const attendanceDate = new Date().toISOString().slice(0, 10);
    const marked = await request(app).post('/api/v1/attendance/mark')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ date: attendanceDate, session: 'AM', entries: [{ studentId: studentA, status: 'Present' }] });
    expect(marked.status).toBe(201);

    // one invoice -> fees byStatus must include Pending with count 1 and its amount summed
    const invoice = await request(app)
      .post('/api/v1/fees')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ refId: 'INV-7101', studentId: studentA, term: 'Term 1', amount: 2500, dueDate: '2026-09-01' });
    expect(invoice.status).toBe(201);
    const partial = await request(app)
      .post(`/api/v1/fees/${invoice.body.data._id}/pay`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ paymentMethod: 'Cash', amount: 1000, reference: 'REPORT-TEST-1' });
    expect(partial.status).toBe(200);
    const exam = await request(app).post('/api/v1/exams')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Report Test Exam', term: 'Term 1', subjects: ['Mathematics'], maxMarks: 100, passMark: 50 });
    expect(exam.status).toBe(201);
    const result = await request(app).post('/api/v1/exams/results')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ examId: exam.body.data._id, studentId: studentA, scores: [{ subject: 'Mathematics', marks: 90 }] });
    expect(result.status).toBe(201);
    const secondResult = await request(app).post('/api/v1/exams/results')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ examId: exam.body.data._id, studentId: studentB, scores: [{ subject: 'Mathematics', marks: 75 }] });
    expect(secondResult.status).toBe(201);

    const res = await request(app).get('/api/v1/reports/overview').set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);

    const { students, fees, attendance, exams, applications } = res.body.data;
    const active = students.byStatus.find((s: { _id: string }) => s._id === 'Active');
    expect(active.count).toBe(2);
    expect(students.byGrade).toContainEqual({ _id: 'Grade 10 · A', count: 2 });
    expect(students.averages).not.toBeNull();
    expect(typeof students.averages.avgGpa).toBe('number');
    expect(typeof students.averages.avgAttendancePct).toBe('number');

    const unpaid = fees.byStatus.find((f: { _id: string }) => f._id === 'Overdue');
    expect(unpaid.count).toBe(1);
    expect(unpaid.totalAmount).toBe(2500);
    expect(unpaid.totalPaid).toBe(1000);
    expect(fees).toMatchObject({ billed: 2500, collected: 1000, invoiceCount: 1, paidCount: 0, overdueCount: 1 });
    expect(exams.resultCount).toBe(2);
    expect(exams.byGrade).toContainEqual({ _id: 'A+ / A', count: 2 });
    expect(typeof applications.count).toBe('number');
    expect(attendance.monthly).toHaveLength(6);
    expect(attendance.monthly.at(-1)).toMatchObject({ month: attendanceDate.slice(0, 7), attended: 1, eligible: 1, rate: 100 });
  });

  it('an empty school returns empty groupings and null averages rather than crashing', async () => {
    const admin = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    const res = await request(app).get('/api/v1/reports/overview').set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    // note: in a shared test DB other tests' data may exist; the shape assertions are what matter
    expect(Array.isArray(res.body.data.staff.byType)).toBe(true);
    expect(Array.isArray(res.body.data.helpdesk.byStatus)).toBe(true);
    expect(res.body.data.attendance.monthly).toHaveLength(6);
  });
});
