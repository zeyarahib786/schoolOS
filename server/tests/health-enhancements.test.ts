import request from 'supertest';
import { createApp } from '../src/app';
import { ClinicVisit } from '../src/models/ClinicVisit';
import { Student } from '../src/models/Student';
import { AuditLog } from '../src/models/AuditLog';
import { schoolToday } from '../src/modules/attendance/attendance.dates';
import { Role } from '../src/types/roles';
const app = createApp();
async function user(role: Role, name: string) {
  const r = await request(app)
    .post('/api/v1/auth/register')
    .send({ name, email: name + '@example.invalid', password: 'StrongPass123', role });
  expect(r.status).toBe(201);
  return r.body.data;
}
const auth = (u: { accessToken: string }) => ({ Authorization: 'Bearer ' + u.accessToken });
async function fixture() {
  const a = await user('Principal', 'health-office'),
    p = await user('Parent', 'health-parent'),
    s = await user('Student', 'health-student');
  const student = await Student.create({
    refId: 'HEALTH-QA',
    name: 'QA Health Student',
    grade: 'Grade 7 A',
    gender: 'Female',
    roll: '1',
    guardianName: 'QA Parent',
    phone: '123456789',
    guardianUserId: p.user._id,
    studentUserId: s.user._id,
  });
  return { a, p, s, student };
}
const visit = {
  reason: 'Fictional clinic handover',
  treatment: 'Recorded staff care',
  outcome: 'Under observation',
  severity: 'Urgent',
};
describe('Health real-life workflow refinements', () => {
  it('preserves owned family access for Parent and Student, keeps Teacher and Accountant history private', async () => {
    const { a, p, s, student } = await fixture(),
      teacher = await user('Teacher', 'health-teacher'),
      accountant = await user('Accountant', 'health-accountant'),
      other = await user('Parent', 'health-other');
    await request(app)
      .post('/api/v1/health-records')
      .set(auth(a))
      .send({ ...visit, studentId: student.id });
    for (const u of [p, s])
      expect((await request(app).get('/api/v1/health-records').set(auth(u))).body.data).toHaveLength(1);
    for (const u of [teacher, accountant, other])
      expect((await request(app).get('/api/v1/health-records').set(auth(u))).body.data).toHaveLength(0);
  });
  it('validates real calendar dates and office-only historical handovers', async () => {
    const { a, student } = await fixture(),
      teacher = await user('Teacher', 'health-teacher'),
      today = await schoolToday();
    for (const visitDate of ['2026-02-30', '2099-01-01'])
      expect(
        (
          await request(app)
            .post('/api/v1/health-records')
            .set(auth(a))
            .send({ ...visit, studentId: student.id, visitDate })
        ).status,
      ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/v1/health-records')
          .set(auth(teacher))
          .send({ ...visit, studentId: student.id, visitDate: '2020-01-01' })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post('/api/v1/health-records')
          .set(auth(a))
          .send({ ...visit, studentId: student.id, visitDate: today, followUpDate: '2020-01-01' })
      ).status,
    ).toBe(400);
    expect(await ClinicVisit.countDocuments()).toBe(0);
  });
  it('requires version and reason, persists follow-up/contact and dated correction history, rejects stale overwrite', async () => {
    const { a, student } = await fixture(),
      today = await schoolToday();
    const made = await request(app)
      .post('/api/v1/health-records')
      .set(auth(a))
      .send({ ...visit, studentId: student.id, followUpDate: today, followUpNote: 'Fictional observation follow-up' });
    expect(made.status).toBe(201);
    const id = made.body.data._id,
      version = made.body.data.updatedAt;
    expect(
      (
        await request(app)
          .patch('/api/v1/health-records/' + id)
          .set(auth(a))
          .send({ outcome: 'Sent home' })
      ).status,
    ).toBe(400);
    const update = {
      outcome: 'Sent home',
      parentContacted: true,
      followUpDate: null,
      reason: 'Guardian collected student',
      expectedUpdatedAt: version,
    };
    const saved = await request(app)
      .patch('/api/v1/health-records/' + id)
      .set(auth(a))
      .send(update);
    expect(saved.status).toBe(200);
    expect(saved.body.data.parentContactedAt).toBeTruthy();
    expect(saved.body.data.followUpDate).toBeUndefined();
    expect(saved.body.data.history).toHaveLength(1);
    expect(saved.body.data.history[0]).toMatchObject({
      previousOutcome: 'Under observation',
      outcome: 'Sent home',
      reason: update.reason,
    });
    expect(
      (
        await request(app)
          .patch('/api/v1/health-records/' + id)
          .set(auth(a))
          .send({ ...update, outcome: 'Returned to class' })
      ).status,
    ).toBe(409);
    expect((await ClinicVisit.findById(id))?.outcome).toBe('Sent home');
  });
  it('retains all pages and does not leak clinical reason into general audit', async () => {
    const { a, student } = await fixture();
    await request(app)
      .post('/api/v1/health-records')
      .set(auth(a))
      .send({ ...visit, studentId: student.id });
    const logs = await AuditLog.find({ module: 'Health' });
    expect(JSON.stringify(logs)).not.toContain(visit.reason);
    await ClinicVisit.insertMany(
      Array.from({ length: 24 }, () => ({
        student: student._id,
        reason: 'QA',
        treatment: 'QA',
        outcome: 'Returned to class',
        recordedBy: a.user._id,
      })),
    );
    const r = await request(app).get('/api/v1/health-records?limit=20&page=2').set(auth(a));
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(5);
    expect(r.body.meta.pagination.total).toBe(25);
  });
});
