import request from 'supertest';
import { createApp } from '../src/app';
import { Student } from '../src/models/Student';
import { Guardian } from '../src/models/Guardian';
import { Staff } from '../src/models/Staff';
import { MeetingSlot } from '../src/models/MeetingSlot';
import { Role } from '../src/types/roles';
const app = createApp();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
async function account(role: Role, suffix: string) {
  const email = `${suffix}@example.invalid`;
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: suffix, email, password: 'StrongPass123', role });
  expect(response.status).toBe(201);
  return { ...response.body.data, email };
}
async function child(refId: string, guardianUserId?: string) {
  return Student.create({
    refId,
    name: 'Child ' + refId,
    grade: 'Grade 7 · A',
    gender: 'Female',
    roll: '007',
    guardianName: 'Guardian',
    phone: '+971501234567',
    guardianUserId,
  });
}
function body(studentIds: string[] = [], refId = 'GRD-QA') {
  return {
    refId,
    name: 'QA Guardian',
    relation: 'Mother',
    phone: '+971501234567',
    studentIds,
    pickupAuthorized: false,
    financialResponsible: true,
    custody: 'Not recorded',
    consents: { media: null, trips: false, medical: true },
    note: '',
  };
}
async function create(token: string, students: string[] = [], refId = 'GRD-QA') {
  const result = await request(app).post('/api/v1/guardians').set(auth(token)).send(body(students, refId));
  expect(result.status).toBe(201);
  return result.body.data;
}
async function link(token: string, guardian: { _id: string; updatedAt: string }, email: string | null) {
  return request(app)
    .patch('/api/v1/guardians/' + guardian._id + '/account')
    .set(auth(token))
    .send({ parentEmail: email, expectedUpdatedAt: guardian.updatedAt });
}
describe('Parents enhancement workflows', () => {
  it('persists contact-only guardians, supports shared/missing email and preserves tri-state consents', async () => {
    const admin = await account('Administrator', 'contact-admin');
    const first = await create(admin.accessToken);
    expect(first).toMatchObject({
      portalStatus: 'Invited',
      pickupAuthorized: false,
      consents: { media: null, trips: false, medical: true },
    });
    expect(first.lastLoginAt).toBeNull();
    await create(admin.accessToken, [], 'GRD-QA2');
    const duplicate = await request(app).post('/api/v1/guardians').set(auth(admin.accessToken)).send(body());
    expect(duplicate.status).toBe(409);
  });
  it('validates child references and stale edits without changing contact or ownership data', async () => {
    const admin = await account('Administrator', 'edit-admin');
    const g = await create(admin.accessToken);
    const invalid = await request(app)
      .patch('/api/v1/guardians/' + g._id)
      .set(auth(admin.accessToken))
      .send({ ...body(['64b7f9c9a1b2c3d4e5f60789']), name: 'Changed', expectedUpdatedAt: g.updatedAt });
    expect(invalid.status).toBe(400);
    expect((await Guardian.findById(g._id))!.name).toBe('QA Guardian');
    const edited = await request(app)
      .patch('/api/v1/guardians/' + g._id)
      .set(auth(admin.accessToken))
      .send({ ...body(), name: 'Edited Guardian', email: '', expectedUpdatedAt: g.updatedAt });
    expect(edited.status).toBe(200);
    const stale = await request(app)
      .patch('/api/v1/guardians/' + g._id)
      .set(auth(admin.accessToken))
      .send({ ...body(), expectedUpdatedAt: g.updatedAt });
    expect(stale.status).toBe(409);
  });
  it('links multiple children atomically to an existing active Parent and unlinks ownership on removal', async () => {
    const admin = await account('Administrator', 'link-admin'),
      parent = await account('Parent', 'link-parent');
    const a = await child('QA-A'),
      b = await child('QA-B');
    const g = await create(admin.accessToken, [String(a._id), String(b._id)]);
    const linked = await link(admin.accessToken, g, parent.email);
    expect(linked.status).toBe(200);
    expect(await Student.countDocuments({ guardianUserId: parent.user._id })).toBe(2);
    const edit = await request(app)
      .patch('/api/v1/guardians/' + g._id)
      .set(auth(admin.accessToken))
      .send({ ...body([String(a._id)]), expectedUpdatedAt: linked.body.data.updatedAt });
    expect(edit.status).toBe(200);
    expect((await Student.findById(b._id))!.guardianUserId).toBeUndefined();
    const unlinked = await link(admin.accessToken, edit.body.data, null);
    expect(unlinked.status).toBe(200);
    expect(await Student.countDocuments({ guardianUserId: parent.user._id })).toBe(0);
  });
  it('rejects wrong-role accounts, another family ownership and duplicate account links without partial writes', async () => {
    const admin = await account('Administrator', 'conflict-admin'),
      parent = await account('Parent', 'conflict-parent'),
      other = await account('Parent', 'other-parent');
    const student = await child('QA-CONFLICT', other.user._id);
    const g = await create(admin.accessToken, [String(student._id)]);
    expect((await link(admin.accessToken, g, admin.email)).status).toBe(400);
    expect((await link(admin.accessToken, g, parent.email)).status).toBe(409);
    expect((await Guardian.findById(g._id))!.userId).toBeNull();
    expect(String((await Student.findById(student._id))!.guardianUserId)).toBe(other.user._id);
    const otherG = await create(admin.accessToken, [], 'GRD-OTHER');
    expect((await link(admin.accessToken, otherG, parent.email)).status).toBe(200);
    expect((await link(admin.accessToken, g, parent.email)).status).toBe(409);
  });
  it('checks all six role views: leadership manages, Parent sees own profile, other roles cannot read the directory', async () => {
    const admin = await account('Administrator', 'roles-admin'),
      parent = await account('Parent', 'roles-parent');
    const a = await child('QA-OWN'),
      g = await create(admin.accessToken, [String(a._id)]);
    await link(admin.accessToken, g, parent.email);
    const stranger = await create(admin.accessToken, [], 'GRD-STRANGER');
    await Guardian.updateOne({ _id: g._id }, { $set: { note: 'Office-only note' } });
    for (const role of ['Administrator', 'Principal', 'Teacher', 'Accountant', 'Parent', 'Student'] as Role[]) {
      const u =
        role === 'Administrator'
          ? admin
          : role === 'Parent'
            ? parent
            : await account(role, 'roles-' + role.toLowerCase());
      const list = await request(app).get('/api/v1/guardians').set(auth(u.accessToken));
      expect(list.status).toBe(['Administrator', 'Principal', 'Parent'].includes(role) ? 200 : 403);
      if (role === 'Parent') expect(list.body.data.map((r: { refId: string }) => r.refId)).toEqual(['GRD-QA']);
      if (role === 'Parent') expect(list.body.data[0].note).toBeUndefined();
      const write = await request(app)
        .post('/api/v1/guardians')
        .set(auth(u.accessToken))
        .send(body([], 'GRD-' + role));
      expect(write.status).toBe(['Administrator', 'Principal'].includes(role) ? 201 : 403);
    }
    const ownDetail = await request(app)
      .get('/api/v1/guardians/' + g._id)
      .set(auth(parent.accessToken));
    expect(ownDetail.body.data.note).toBeUndefined();
    expect(
      (
        await request(app)
          .get('/api/v1/guardians/' + stranger._id)
          .set(auth(parent.accessToken))
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get('/api/v1/guardians/' + stranger._id + '/messages')
          .set(auth(parent.accessToken))
      ).status,
    ).toBe(403);
  });
  it('keeps primary Student ownership authoritative when its portal link changes elsewhere', async () => {
    const admin = await account('Administrator', 'scope-admin'),
      parent = await account('Parent', 'scope-parent'),
      other = await account('Parent', 'scope-other');
    const a = await child('QA-SCOPE'),
      g = await create(admin.accessToken, [String(a._id)]);
    await link(admin.accessToken, g, parent.email);
    await Student.updateOne({ _id: a._id }, { guardianUserId: other.user._id });
    const result = await request(app).get('/api/v1/guardians').set(auth(parent.accessToken));
    expect(result.body.data[0].studentIds).toHaveLength(0);
    const detail = await request(app)
      .get('/api/v1/guardians/' + g._id)
      .set(auth(parent.accessToken));
    expect(detail.body.data.studentIds).toHaveLength(0);
  });
  it('persists two-way own-family conversations and rejects broadcast/foreign-thread access for Parents', async () => {
    const admin = await account('Administrator', 'messages-admin'),
      parent = await account('Parent', 'messages-parent');
    const g = await create(admin.accessToken),
      stranger = await create(admin.accessToken, [], 'GRD-FOREIGN');
    await link(admin.accessToken, g, parent.email);
    const outgoing = await request(app)
      .post('/api/v1/guardians/' + g._id + '/messages')
      .set(auth(admin.accessToken))
      .send({ text: 'School notice' });
    expect(outgoing.body.data.direction).toBe('out');
    const incoming = await request(app)
      .post('/api/v1/guardians/' + g._id + '/messages')
      .set(auth(parent.accessToken))
      .send({ text: 'Parent reply' });
    expect(incoming.body.data.direction).toBe('in');
    expect(
      (
        await request(app)
          .post('/api/v1/guardians/' + stranger._id + '/messages')
          .set(auth(parent.accessToken))
          .send({ text: 'Intrusion' })
      ).status,
    ).toBe(403);
    expect((await request(app).get('/api/v1/guardians/broadcasts').set(auth(parent.accessToken))).status).toBe(403);
    const thread = await request(app)
      .get('/api/v1/guardians/' + g._id + '/messages')
      .set(auth(parent.accessToken));
    expect(thread.body.data.map((m: { text: string }) => m.text)).toEqual(['School notice', 'Parent reply']);
  });
  it('enforces suspension on existing JWTs, password login and refresh, and restores access without spoofing last login', async () => {
    const admin = await account('Administrator', 'suspend-admin'),
      parent = await account('Parent', 'suspend-parent');
    const g = await create(admin.accessToken);
    await link(admin.accessToken, g, parent.email);
    const suspended = await request(app)
      .patch('/api/v1/guardians/' + g._id + '/portal')
      .set(auth(admin.accessToken))
      .send({ status: 'Suspended' });
    expect(suspended.status).toBe(200);
    expect((await request(app).get('/api/v1/students').set(auth(parent.accessToken))).status).toBe(403);
    expect(
      (await request(app).post('/api/v1/auth/login').send({ email: parent.email, password: 'StrongPass123' })).status,
    ).toBe(403);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: parent.refreshToken })).status).toBe(
      403,
    );
    const restored = await request(app)
      .patch('/api/v1/guardians/' + g._id + '/portal')
      .set(auth(admin.accessToken))
      .send({ status: 'Active' });
    expect(restored.body.data.lastLoginAt).toBeNull();
    expect((await request(app).get('/api/v1/students').set(auth(parent.accessToken))).status).toBe(200);
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: parent.email, password: 'StrongPass123' });
    expect(login.status).toBe(200);
    expect((await Guardian.findById(g._id))!.lastLoginAt).toBeTruthy();
  });
  it('does not leak booked participants to other families, Accountant or Student; keeps booking races atomic', async () => {
    const admin = await account('Administrator', 'meeting-admin'),
      parent = await account('Parent', 'meeting-parent'),
      other = await account('Parent', 'meeting-other');
    const a = await child('QA-MEET', parent.user._id);
    const teacher = await Staff.create({
      refId: 'EMP-PARENT',
      name: 'QA Teacher',
      designation: 'Teacher',
      department: 'QA',
      type: 'Teaching',
      email: 'teacher-meet@example.invalid',
      phone: '+971501234567',
      joinedDate: new Date(),
    });
    const slot = await MeetingSlot.create({ teacher: teacher._id, date: new Date('2026-12-10'), startTime: '10:00' });
    expect(
      (
        await request(app)
          .post('/api/v1/meetings/' + slot._id + '/book')
          .set(auth(parent.accessToken))
          .send({ studentId: a._id })
      ).status,
    ).toBe(200);
    for (const u of [
      other,
      await account('Accountant', 'meeting-accountant'),
      await account('Student', 'meeting-student'),
    ]) {
      const result = await request(app).get('/api/v1/meetings').set(auth(u.accessToken));
      expect(result.status).toBe(200);
      expect(result.body.data).toHaveLength(0);
    }
    expect((await request(app).get('/api/v1/meetings').set(auth(parent.accessToken))).body.data).toHaveLength(1);
    expect((await request(app).get('/api/v1/meetings').set(auth(admin.accessToken))).body.data).toHaveLength(1);
  });
  it('allows shared contact emails and treats onlyOpen=false as a real false filter', async () => {
    const admin = await account('Administrator', 'shared-admin');
    for (const ref of ['GRD-SHARED1', 'GRD-SHARED2']) {
      const result = await request(app)
        .post('/api/v1/guardians')
        .set(auth(admin.accessToken))
        .send({ ...body([], ref), email: 'shared@example.invalid' });
      expect(result.status).toBe(201);
    }
    const teacher = await Staff.create({
      refId: 'EMP-FILTER',
      name: 'Filter Teacher',
      designation: 'Teacher',
      department: 'QA',
      type: 'Teaching',
      email: 'filter@example.invalid',
      phone: '+971501234567',
      joinedDate: new Date(),
    });
    await MeetingSlot.create({
      teacher: teacher._id,
      date: new Date('2026-12-10'),
      startTime: '10:00',
      status: 'Confirmed',
    });
    const result = await request(app).get('/api/v1/meetings?onlyOpen=false').set(auth(admin.accessToken));
    expect(result.body.data).toHaveLength(1);
  });
  it('validates teaching staff and permits Teachers to publish only their own slots', async () => {
    const admin = await account('Administrator', 'publish-admin'),
      teacher = await account('Teacher', 'publish-teacher');
    const staff = await Staff.create({
      refId: 'EMP-PUBLISH',
      name: 'Publish Teacher',
      designation: 'Teacher',
      department: 'QA',
      type: 'Teaching',
      email: teacher.email,
      userId: teacher.user._id,
      phone: '+971501234567',
      joinedDate: new Date(),
    });
    const data = { teacherStaffId: String(staff._id), date: '2026-12-10', startTime: '10:00' };
    expect((await request(app).post('/api/v1/meetings').set(auth(teacher.accessToken)).send(data)).status).toBe(201);
    const other = await Staff.create({
      refId: 'EMP-OTHER',
      name: 'Other Teacher',
      designation: 'Teacher',
      department: 'QA',
      type: 'Teaching',
      email: 'publish-other@example.invalid',
      phone: '+971501234567',
      joinedDate: new Date(),
    });
    expect(
      (
        await request(app)
          .post('/api/v1/meetings')
          .set(auth(teacher.accessToken))
          .send({ ...data, teacherStaffId: String(other._id) })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post('/api/v1/meetings')
          .set(auth(admin.accessToken))
          .send({ ...data, teacherStaffId: '64b7f9c9a1b2c3d4e5f60789' })
      ).status,
    ).toBe(400);
  });
});
