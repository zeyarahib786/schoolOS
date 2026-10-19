import request from 'supertest';
import { createApp } from '../src/app';
import { Student } from '../src/models/Student';
import { schoolToday } from '../src/modules/attendance/attendance.dates';
const app = createApp();
async function fixture() {
  const actor = (
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'QA office', email: 'office@example.invalid', password: 'LocalFixture123!', role: 'Administrator' })
  ).body.data;
  const auth = 'Bearer ' + actor.accessToken;
  const student = (
    await request(app).post('/api/v1/students').set('Authorization', auth).send({
      refId: 'QA-SIGNAL',
      name: 'QA reviewed student',
      grade: 'Grade 7 · A',
      gender: 'Female',
      roll: '1',
      guardianName: 'QA guardian',
      phone: '+971501234567',
    })
  ).body.data;
  return { auth, student };
}
describe('Recorded leadership review signals', () => {
  it('does not score missing evidence or legacy stored student percentages/GPA', async () => {
    const f = await fixture();
    await Student.findByIdAndUpdate(f.student._id, { attendancePct: 12, gpa: 1 });
    const r = await request(app).get('/api/v1/reports/insights').set('Authorization', f.auth);
    expect(r.status).toBe(200);
    expect(r.body.data.rows).toEqual([]);
    expect(r.body.data.activeStudentCount).toBe(1);
    expect(r.body.data.engine).toBe('Recorded rules');
  });
  it('uses actual attendance and assessments, saved stock thresholds and school-currency amounts', async () => {
    const f = await fixture();
    await request(app)
      .post('/api/v1/attendance/mark')
      .set('Authorization', f.auth)
      .send({ date: await schoolToday(), session: 'AM', entries: [{ studentId: f.student._id, status: 'Absent' }] });
    const exam = (
      await request(app)
        .post('/api/v1/exams')
        .set('Authorization', f.auth)
        .send({ name: 'QA review exam', term: 'QA term', subjects: ['Mathematics'], maxMarks: 100, passMark: 50 })
    ).body.data;
    await request(app)
      .post('/api/v1/exams/results')
      .set('Authorization', f.auth)
      .send({ examId: exam._id, studentId: f.student._id, scores: [{ subject: 'Mathematics', marks: 40 }] });
    await request(app).post('/api/v1/inventory/items').set('Authorization', f.auth).send({
      sku: 'QA-LOW',
      name: 'QA paper',
      category: 'Stationery',
      quantityOnHand: 2,
      reorderLevel: 5,
      unitCost: 1,
    });
    const r = (await request(app).get('/api/v1/reports/insights').set('Authorization', f.auth)).body.data;
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({
      priority: 75,
      attendance: { rate: 0, eligible: 1 },
      assessment: { averagePercent: 40, resultCount: 1 },
    });
    expect(r.lowStock).toHaveLength(1);
    expect((await Student.findById(f.student._id))?.status).toBe('Active');
  });
  it('denies non-leadership insight access', async () => {
    const actor = (
      await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'QA parent', email: 'parent@example.invalid', password: 'LocalFixture123!', role: 'Parent' })
    ).body.data;
    expect(
      (
        await request(app)
          .get('/api/v1/reports/insights')
          .set('Authorization', 'Bearer ' + actor.accessToken)
      ).status,
    ).toBe(403);
  });
});
