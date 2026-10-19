import request from 'supertest';
import { createApp } from '../src/app';
import { Student } from '../src/models/Student';
import { AlumniProfile } from '../src/models/AlumniProfile';
import { HostelRoom } from '../src/models/HostelRoom';
const app = createApp();
async function fixture() {
  const auth = async (role: string, email: string) =>
    (
      await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Fictional ' + role, email, password: 'LocalFixture123!', role })
    ).body.data;
  const admin = await auth('Administrator', 'office@example.invalid'),
    parent = await auth('Parent', 'parent@example.invalid'),
    student = await auth('Student', 'student@example.invalid');
  const create = async (refId: string) =>
    (
      await request(app)
        .post('/api/v1/students')
        .set('Authorization', 'Bearer ' + admin.accessToken)
        .send({
          refId,
          name: 'Fictional ' + refId,
          grade: 'Grade 12 · A',
          gender: 'Female',
          roll: '1',
          guardianName: 'Fictional guardian',
          phone: '+971501234567',
        })
    ).body.data;
  const own = await create('QA-OWN'),
    other = await create('QA-OTHER');
  await request(app)
    .patch('/api/v1/students/' + own._id + '/accounts')
    .set('Authorization', 'Bearer ' + admin.accessToken)
    .send({ parentEmail: 'parent@example.invalid', studentEmail: 'student@example.invalid' });
  const graduate = (id: string, extra: object = {}) =>
    request(app)
      .post('/api/v1/alumni/graduate')
      .set('Authorization', 'Bearer ' + admin.accessToken)
      .send({
        studentId: id,
        graduationYear: 2026,
        academicCompletionConfirmed: true,
        notes: 'Private school notes',
        ...extra,
      });
  return { admin, parent, student, own, other, graduate };
}
describe('Reviewed graduation and owned alumni records', () => {
  it('requires confirmed completion and rejects future years or stale student versions', async () => {
    const f = await fixture();
    expect((await f.graduate(f.own._id, { academicCompletionConfirmed: false })).status).toBe(400);
    expect((await f.graduate(f.own._id, { graduationYear: 2099 })).status).toBe(400);
    expect((await f.graduate(f.own._id, { expectedUpdatedAt: '2000-01-01T00:00:00.000Z' })).status).toBe(409);
    expect(await AlumniProfile.countDocuments()).toBe(0);
  });
  it('blocks hostel allocation and rolls back all graduation writes', async () => {
    const f = await fixture();
    const room = await HostelRoom.create({ roomNumber: 'QA-1', block: 'QA', capacity: 2, occupants: [f.own._id] });
    const check = await request(app)
      .get('/api/v1/alumni/eligibility/' + f.own._id)
      .set('Authorization', 'Bearer ' + f.admin.accessToken);
    expect(check.body.data.ready).toBe(false);
    expect(check.body.data.rooms).toBe(1);
    expect((await f.graduate(f.own._id)).status).toBe(409);
    expect((await Student.findById(f.own._id))?.status).toBe('Active');
    expect(await AlumniProfile.countDocuments()).toBe(0);
    await HostelRoom.findByIdAndUpdate(room._id, { occupants: [] });
    expect((await f.graduate(f.own._id)).status).toBe(201);
  });
  it('concurrent graduation creates exactly one profile', async () => {
    const f = await fixture();
    const results = await Promise.all([f.graduate(f.own._id), f.graduate(f.own._id)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await AlumniProfile.countDocuments({ student: f.own._id })).toBe(1);
  });
  it('scopes family records, hides internal notes and permits only owned Student profile review', async () => {
    const f = await fixture();
    await f.graduate(f.own._id);
    const other = (await f.graduate(f.other._id)).body.data;
    for (const actor of [f.parent, f.student]) {
      const list = await request(app)
        .get('/api/v1/alumni')
        .set('Authorization', 'Bearer ' + actor.accessToken);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].notes).toBeUndefined();
      expect(list.body.data[0].history).toEqual([]);
    }
    const own = (await AlumniProfile.findOne({ student: f.own._id }))!;
    const body = {
      expectedUpdatedAt: own.updatedAt.toISOString(),
      reason: 'Fictional profile correction',
      currentEmployer: 'QA institution',
      contactEmail: 'alumni@example.invalid',
      allowContact: true,
    };
    expect(
      (
        await request(app)
          .patch('/api/v1/alumni/' + own._id)
          .set('Authorization', 'Bearer ' + f.parent.accessToken)
          .send(body)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .patch('/api/v1/alumni/' + other._id)
          .set('Authorization', 'Bearer ' + f.student.accessToken)
          .send(body)
      ).status,
    ).toBe(404);
    const save = await request(app)
      .patch('/api/v1/alumni/' + own._id)
      .set('Authorization', 'Bearer ' + f.student.accessToken)
      .send(body);
    expect(save.status).toBe(200);
    expect(save.body.data.notes).toBeUndefined();
    expect(save.body.data.allowContact).toBe(true);
    expect(
      (
        await request(app)
          .patch('/api/v1/alumni/' + own._id)
          .set('Authorization', 'Bearer ' + f.student.accessToken)
          .send(body)
      ).status,
    ).toBe(409);
    expect((await AlumniProfile.findById(own._id))?.history).toHaveLength(1);
  });
});
