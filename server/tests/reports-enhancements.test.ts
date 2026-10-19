import request from 'supertest';
import { createApp } from '../src/app';
import { schoolToday } from '../src/modules/attendance/attendance.dates';
import { Student } from '../src/models/Student';
const app = createApp();
async function fixture() {
  const actor = (
    await request(app).post('/api/v1/auth/register').send({
      name: 'Fictional office',
      email: 'office@example.invalid',
      password: 'LocalFixture123!',
      role: 'Administrator',
    })
  ).body.data;
  const auth = 'Bearer ' + actor.accessToken;
  const student = (
    await request(app).post('/api/v1/students').set('Authorization', auth).send({
      refId: 'QA-REPORT',
      name: 'QA report student',
      grade: 'Grade 7 · A',
      gender: 'Female',
      roll: '1',
      guardianName: 'QA guardian',
      phone: '+971501234567',
    })
  ).body.data;
  return { auth, student };
}
describe('School-day report calculation basis', () => {
  it('treats today as Due and preserves exact-cent outstanding and report provenance', async () => {
    const f = await fixture(),
      day = await schoolToday();
    const invoice = await request(app)
      .post('/api/v1/fees')
      .set('Authorization', f.auth)
      .send({ refId: 'QA-INVOICE', studentId: f.student._id, term: 'QA term', amount: 10.35, dueDate: day });
    expect(invoice.status).toBe(201);
    expect(
      (
        await request(app)
          .post('/api/v1/fees/' + invoice.body.data._id + '/pay')
          .set('Authorization', f.auth)
          .send({ paymentMethod: 'Cash', amount: 0.15, reference: 'QA receipt' })
      ).status,
    ).toBe(200);
    const r = (await request(app).get('/api/v1/reports/overview').set('Authorization', f.auth)).body.data;
    expect(r.asOfDay).toBe(day);
    expect(r.generatedAt).toBeDefined();
    expect(r.fees).toMatchObject({ billed: 10.35, collected: 0.15, outstanding: 10.2, dueCount: 1, overdueCount: 0 });
    expect(r.basis.attendance).toContain('Excused');
  });
  it('derives attendance from actual non-excused marks rather than stored student percentage', async () => {
    const f = await fixture(),
      day = await schoolToday();
    await Student.findByIdAndUpdate(f.student._id, { attendancePct: 12 });
    for (const [session, status] of [
      ['AM', 'Late'],
      ['PM', 'Excused'],
    ])
      expect(
        (
          await request(app)
            .post('/api/v1/attendance/mark')
            .set('Authorization', f.auth)
            .send({ date: day, session, entries: [{ studentId: f.student._id, status }] })
        ).status,
      ).toBe(201);
    const r = (await request(app).get('/api/v1/reports/overview').set('Authorization', f.auth)).body.data;
    expect(r.attendance).toMatchObject({ attended: 1, eligible: 1, rate: 100, through: day });
    expect(r.students.averages.avgAttendancePct).toBe(100);
  });
  it('uses null for no attendance records rather than a fabricated zero percent', async () => {
    const f = await fixture();
    const r = (await request(app).get('/api/v1/reports/overview').set('Authorization', f.auth)).body.data;
    expect(r.attendance.rate).toBeNull();
    expect(r.students.averages.avgAttendancePct).toBeNull();
    expect(r.attendance.monthly.every((m: { rate: number | null }) => m.rate === null)).toBe(true);
  });
});
