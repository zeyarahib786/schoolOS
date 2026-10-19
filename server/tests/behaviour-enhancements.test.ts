import request from 'supertest';
import { createApp } from '../src/app';
import { Student } from '../src/models/Student';
import { BehaviourIncident } from '../src/models/BehaviourIncident';
import { Role } from '../src/types/roles';
import { schoolToday } from '../src/modules/attendance/attendance.dates';
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
  const office = await user('Principal', 'behaviour-office'),
    teacher = await user('Teacher', 'behaviour-teacher'),
    parent = await user('Parent', 'behaviour-parent'),
    studentAccount = await user('Student', 'behaviour-student');
  const student = await Student.create({
    refId: 'BEHAVIOUR-QA',
    name: 'QA Student',
    grade: 'Grade 7 A',
    gender: 'Female',
    roll: '1',
    guardianName: 'QA Parent',
    phone: '123456789',
    guardianUserId: parent.user._id,
    studentUserId: studentAccount.user._id,
  });
  return { office, teacher, parent, studentAccount, student };
}
const entry = { category: 'Classroom', description: 'Fictional case detail', severity: 'Moderate' };
describe('Behaviour review and privacy enhancements', () => {
  it('defaults type-appropriate points and private pastoral notes, scopes Student and family records', async () => {
    const f = await fixture();
    const make = async (type: string, extra = {}) =>
      request(app)
        .post('/api/v1/behaviour')
        .set(auth(f.teacher))
        .send({ ...entry, studentId: f.student.id, type, ...extra });
    expect((await make('Merit')).body.data).toMatchObject({ points: 2, status: 'Closed' });
    expect((await make('Pastoral note', { witness: 'Private witness' })).body.data).toMatchObject({
      points: 0,
      visibility: 'Staff only',
    });
    expect((await make('Incident', { witness: 'Private staff name' })).body.data.points).toBe(-2);
    expect((await make('Merit', { points: -5 })).status).toBe(400);
    for (const u of [f.parent, f.studentAccount]) {
      const r = await request(app).get('/api/v1/behaviour').set(auth(u));
      expect(r.body.data).toHaveLength(2);
      expect(JSON.stringify(r.body.data)).not.toContain('Private staff name');
      expect(r.body.data.every((v: { history: unknown[] }) => v.history.length === 0)).toBe(true);
    }
    expect((await request(app).get('/api/v1/behaviour').set(auth(f.office))).body.data).toHaveLength(3);
  });
  it('requires real active students and valid non-future dates', async () => {
    const f = await fixture();
    for (const extra of [
      { studentId: '64b7f9c9a1b2c3d4e5f60789' },
      { incidentDate: '2026-02-30' },
      { incidentDate: '2099-01-01' },
      { followUpDate: '2000-01-01' },
    ])
      expect(
        (
          await request(app)
            .post('/api/v1/behaviour')
            .set(auth(f.office))
            .send({ ...entry, studentId: f.student.id, ...extra })
        ).status,
      ).toBe(extra.studentId ? 404 : 400);
    await Student.findByIdAndUpdate(f.student.id, { status: 'Inactive' });
    expect(
      (
        await request(app)
          .post('/api/v1/behaviour')
          .set(auth(f.teacher))
          .send({ ...entry, studentId: f.student.id })
      ).status,
    ).toBe(409);
    expect(await BehaviourIncident.countDocuments()).toBe(0);
  });
  it('protects reporter ownership, office escalation review, versioned decisions and recorded resolution', async () => {
    const f = await fixture(),
      other = await user('Teacher', 'behaviour-other');
    const made = await request(app)
      .post('/api/v1/behaviour')
      .set(auth(f.teacher))
      .send({ ...entry, studentId: f.student.id });
    const id = made.body.data._id,
      version = made.body.data.updatedAt;
    const decide = (u: { accessToken: string }, body: Record<string, unknown>) =>
      request(app)
        .patch('/api/v1/behaviour/' + id + '/status')
        .set(auth(u))
        .send(body);
    const escalation = { status: 'Escalated', expectedUpdatedAt: version, reason: 'Office review requested' };
    expect((await decide(other, escalation)).status).toBe(403);
    const escalated = await decide(f.teacher, escalation);
    expect(escalated.status).toBe(200);
    expect(
      (
        await decide(f.teacher, {
          ...escalation,
          status: 'Closed',
          expectedUpdatedAt: escalated.body.data.updatedAt,
          actionTaken: 'Teacher resolution',
        })
      ).status,
    ).toBe(403);
    expect((await decide(f.office, { ...escalation, status: 'Closed', actionTaken: 'Office resolution' })).status).toBe(
      409,
    );
    expect(
      (await decide(f.office, { ...escalation, status: 'Closed', expectedUpdatedAt: escalated.body.data.updatedAt }))
        .status,
    ).toBe(400);
    const closed = await decide(f.office, {
      status: 'Closed',
      reason: 'Reviewed and resolved',
      actionTaken: 'Fictional school resolution',
      expectedUpdatedAt: escalated.body.data.updatedAt,
    });
    expect(closed.status).toBe(200);
    expect(closed.body.data.history).toHaveLength(2);
    expect(closed.body.data.history[1]).toMatchObject({
      from: 'Escalated',
      to: 'Closed',
      reason: 'Reviewed and resolved',
    });
  });
  it('assigns only active staff, validates follow-ups and allows office reopening without deleting history', async () => {
    const f = await fixture(),
      today = await schoolToday();
    const made = await request(app)
      .post('/api/v1/behaviour')
      .set(auth(f.teacher))
      .send({ ...entry, studentId: f.student.id });
    const id = made.body.data._id,
      update = {
        status: 'Logged',
        reason: 'Scheduled pastoral follow-up',
        expectedUpdatedAt: made.body.data.updatedAt,
        followUpDate: today,
      };
    expect(
      (
        await request(app)
          .patch('/api/v1/behaviour/' + id + '/status')
          .set(auth(f.office))
          .send({ ...update, assignedToEmail: 'behaviour-parent@example.invalid' })
      ).status,
    ).toBe(400);
    const assigned = await request(app)
      .patch('/api/v1/behaviour/' + id + '/status')
      .set(auth(f.office))
      .send({ ...update, assignedToEmail: 'behaviour-teacher@example.invalid' });
    expect(assigned.status).toBe(200);
    expect(assigned.body.data.assignedTo._id).toBe(f.teacher.user._id);
    const closed = await request(app)
      .patch('/api/v1/behaviour/' + id + '/status')
      .set(auth(f.office))
      .send({
        status: 'Closed',
        reason: 'Completed follow-up',
        followUpDate: today,
        actionTaken: 'Fictional action',
        expectedUpdatedAt: assigned.body.data.updatedAt,
      });
    expect(closed.status).toBe(200);
    expect(closed.body.data.followUpDate).toBeUndefined();
    const opened = await request(app)
      .patch('/api/v1/behaviour/' + id + '/status')
      .set(auth(f.office))
      .send({ status: 'Logged', reason: 'New information received', expectedUpdatedAt: closed.body.data.updatedAt });
    expect(opened.status).toBe(200);
    expect(opened.body.data.history).toHaveLength(3);
  });
});
