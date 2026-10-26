import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Student } from '../src/models/Student';
import { Staff } from '../src/models/Staff';
import { Guardian } from '../src/models/Guardian';
beforeEach(() => {
  process.env.SCHOOL_LOGIN_CODE = 'SCH';
});
const app = createApp(),
  base = '/api/v1/auth';
async function account(role = 'Administrator') {
  const r = await request(app)
    .post(base + '/register')
    .send({
      name: role + ' Example',
      email: role.toLowerCase() + '@example.invalid',
      password: 'OriginalPass123',
      role,
    });
  expect(r.status).toBe(201);
  return { id: r.body.data.user._id, h: { Authorization: 'Bearer ' + r.body.data.accessToken } };
}
async function student(refId = 'DEMO-01') {
  return Student.create({
    refId,
    name: 'Fictional learner',
    grade: 'Grade 7 · A',
    gender: 'Female',
    roll: '1',
    guardianName: 'Fictional parent',
    phone: '+12025550143',
  });
}
async function provision(admin: Awaited<ReturnType<typeof account>>, kind: string, id: string, extra = {}) {
  return request(app)
    .post(base + '/accounts')
    .set(admin.h)
    .send({ kind, recordId: id, ...extra });
}
it('only Administrator can list and generate managed credentials', async () => {
  const s = await student();
  for (const role of ['Teacher', 'Principal', 'Accountant', 'Parent', 'Student']) {
    const a = await account(role);
    expect(
      (
        await request(app)
          .get(base + '/accounts/directory')
          .set(a.h)
      ).status,
    ).toBe(403);
    expect((await provision(a, 'Student', String(s._id))).status).toBe(403);
  }
  expect((await request(app).get(base + '/accounts/directory')).status).toBe(401);
});
it('creates linked student login, requires password change, and revokes temporary sessions after changing it', async () => {
  const admin = await account(),
    s = await student();
  const r = await provision(admin, 'Student', String(s._id));
  expect(r.status).toBe(201);
  const c = r.body.data;
  expect(c.loginId).toBe('sch-stu-2026-7a-001');
  expect(c.temporaryPassword.length).toBeGreaterThan(20);
  expect(r.headers['cache-control']).toBe('no-store');
  expect(String((await Student.findById(s._id))!.studentUserId)).toBe(c.userId);
  expect((await provision(admin, 'Student', String(s._id))).status).toBe(409);
  const login = await request(app)
    .post(base + '/login')
    .send({ role: 'Student', email: c.loginId, password: c.temporaryPassword });
  expect(login.status).toBe(200);
  expect(login.body.data.user.passwordHash).toBeUndefined();
  const h = { Authorization: 'Bearer ' + login.body.data.accessToken };
  expect((await request(app).get('/api/v1/students').set(h)).body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  const profile = await request(app)
    .get(base + '/profile')
    .set(h);
  expect(profile.body.data.students).toEqual([]);
  expect(
    (
      await request(app)
        .post(base + '/password')
        .set(h)
        .send({ currentPassword: 'WrongPassword', newPassword: 'NewPersonal123' })
    ).status,
  ).toBe(401);
  expect(
    (
      await request(app)
        .post(base + '/password')
        .set(h)
        .send({ currentPassword: c.temporaryPassword, newPassword: 'NewPersonal123' })
    ).status,
  ).toBe(200);
  expect(
    (
      await request(app)
        .get(base + '/me')
        .set(h)
    ).status,
  ).toBe(401);
  const second = await request(app)
    .post(base + '/login')
    .send({ role: 'Student', email: c.loginId, password: 'NewPersonal123' });
  expect(second.status).toBe(200);
  const own = await request(app)
    .get(base + '/profile?userId=' + admin.id)
    .set({ Authorization: 'Bearer ' + second.body.data.accessToken });
  expect(own.body.data.students).toHaveLength(1);
  expect(own.body.data.user._id).toBe(c.userId);
  expect(own.body.data.user.mustChangePassword).toBe(false);
  expect(JSON.stringify(own.body)).not.toContain('passwordHash');
});
it('resets managed passwords, expires them, and does not allow admin takeover through reset', async () => {
  const admin = await account(),
    s = await student(),
    c = (await provision(admin, 'Student', String(s._id))).body.data;
  const login = await request(app)
    .post(base + '/login')
    .send({ role: 'Student', email: c.loginId, password: c.temporaryPassword });
  const reset = await request(app)
    .post(base + '/accounts/' + c.userId + '/reset')
    .set(admin.h);
  expect(reset.status).toBe(200);
  expect(reset.body.data.temporaryPassword).not.toBe(c.temporaryPassword);
  expect(
    (
      await request(app)
        .get(base + '/me')
        .set({ Authorization: 'Bearer ' + login.body.data.accessToken })
    ).status,
  ).toBe(401);
  expect(
    (
      await request(app)
        .post(base + '/login')
        .send({ role: 'Student', email: c.loginId, password: c.temporaryPassword })
    ).status,
  ).toBe(401);
  await User.updateOne({ _id: c.userId }, { $set: { temporaryPasswordExpiresAt: new Date(Date.now() - 1000) } });
  expect(
    (
      await request(app)
        .post(base + '/login')
        .send({ role: 'Student', email: c.loginId, password: reset.body.data.temporaryPassword })
    ).status,
  ).toBe(403);
  expect(
    (
      await request(app)
        .post(base + '/accounts/' + admin.id + '/reset')
        .set(admin.h)
    ).status,
  ).toBe(400);
  const other = await User.create({
    name: 'Other admin',
    email: 'another@example.invalid',
    role: 'Administrator',
    passwordHash: 'not-used',
  });
  expect(
    (
      await request(app)
        .post(base + '/accounts/' + other._id + '/reset')
        .set(admin.h)
    ).status,
  ).toBe(404);
});
it('links a guardian with all their children and rejects conflicting existing ownership atomically', async () => {
  const admin = await account(),
    s = await student();
  const g = await Guardian.create({
    refId: 'GRD-01',
    name: 'Fictional parent',
    phone: '+12025550143',
    studentIds: [s._id],
  });
  const r = await provision(admin, 'Guardian', String(g._id));
  expect(r.status).toBe(201);
  expect(r.body.data.role).toBe('Parent');
  expect(String((await Student.findById(s._id))!.guardianUserId)).toBe(r.body.data.userId);
  expect((await Guardian.findById(g._id))!.portalStatus).toBe('Active');
  await User.updateOne({ _id: r.body.data.userId }, { $set: { mustChangePassword: false } });
  const login = await request(app)
    .post(base + '/login')
    .send({ role: 'Parent', email: r.body.data.loginId, password: r.body.data.temporaryPassword });
  const profile = await request(app)
    .get(base + '/profile')
    .set({ Authorization: 'Bearer ' + login.body.data.accessToken });
  expect(profile.body.data.students.map((record: { _id: string }) => record._id)).toEqual([String(s._id)]);
  expect(profile.body.data.guardian.refId).toBe('GRD-01');

  const g2 = await Guardian.create({
    refId: 'GRD-02',
    name: 'Other guardian',
    phone: '+12025550144',
    studentIds: [s._id],
  });
  expect((await provision(admin, 'Guardian', String(g2._id))).status).toBe(409);
  expect((await Guardian.findById(g2._id))!.userId).toBeNull();
  expect(await User.countDocuments({ role: 'Parent' })).toBe(1);
});
it('creates correct staff roles without overwriting existing email accounts or elevating to Administrator', async () => {
  const admin = await account();
  const s = await Staff.create({
    refId: 'EMP-01',
    name: 'Fictional teacher',
    designation: 'Teacher',
    department: 'Science',
    type: 'Teaching',
    email: 'science@example.invalid',
    phone: '+12025550143',
    joinedDate: new Date(),
  });
  expect((await provision(admin, 'Staff', String(s._id), { role: 'Administrator' })).status).toBe(400);
  const r = await provision(admin, 'Staff', String(s._id), { role: 'Teacher', email: 'science@example.invalid' });
  expect(r.status).toBe(201);
  expect(r.body.data.role).toBe('Teacher');
  expect(String((await Staff.findById(s._id))!.userId)).toBe(r.body.data.userId);
  await User.updateOne({ _id: r.body.data.userId }, { $set: { mustChangePassword: false } });
  const login = await request(app)
    .post(base + '/login')
    .send({ role: 'Teacher', email: r.body.data.loginId, password: r.body.data.temporaryPassword });
  const profile = await request(app)
    .get(base + '/profile')
    .set({ Authorization: 'Bearer ' + login.body.data.accessToken });
  expect(profile.body.data.staff.refId).toBe('EMP-01');

  const s2 = await student('DEMO-02');
  expect((await provision(admin, 'Student', String(s2._id), { email: 'science@example.invalid' })).status).toBe(409);
  expect((await Student.findById(s2._id))!.studentUserId).toBeUndefined();
});
it('self profile is available for all roles without leaking another person records', async () => {
  await student();
  for (const role of ['Administrator', 'Principal', 'Teacher', 'Accountant', 'Parent', 'Student']) {
    const a = await account(role);
    const r = await request(app)
      .get(base + '/profile')
      .set(a.h);
    expect(r.status).toBe(200);
    expect(r.body.data.user._id).toBe(a.id);
    expect(r.body.data.students).toEqual([]);
    expect(r.body.data.staff).toBeNull();
  }
});
it('concurrent provisioning creates one linked account and search treats regex characters literally', async () => {
  const admin = await account(),
    s = await student();
  const responses = await Promise.all([
    provision(admin, 'Student', String(s._id)),
    provision(admin, 'Student', String(s._id)),
  ]);
  expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
  expect(await User.countDocuments({ role: 'Student' })).toBe(1);
  const r = await request(app)
    .get(base + '/accounts/directory?q=' + encodeURIComponent('.*'))
    .set(admin.h);
  expect(r.status).toBe(200);
  expect(r.body.data.students).toEqual([]);
});

it('does not provision inactive records or Teacher access for non-teaching staff', async () => {
  const admin = await account(),
    s = await student();
  await Student.updateOne({ _id: s._id }, { $set: { status: 'Inactive' } });
  expect((await provision(admin, 'Student', String(s._id))).status).toBe(409);
  const staff = await Staff.create({
    refId: 'EMP-X',
    name: 'Fictional clerk',
    designation: 'Clerk',
    department: 'Office',
    type: 'Non-Teaching',
    email: 'clerk@example.invalid',
    phone: '+12025550143',
    joinedDate: new Date(),
  });
  expect((await provision(admin, 'Staff', String(staff._id), { role: 'Teacher' })).status).toBe(400);
  expect(await User.countDocuments()).toBe(1);
});

it('filters students and linked guardians by exact class while returning independent class choices', async () => {
  const admin = await account(),
    first = await student('CLASS-01'),
    second = await student('CLASS-02');
  await Student.updateOne({ _id: second._id }, { $set: { grade: 'Grade 8 · B' } });
  await Guardian.create({ refId: 'GRD-A', name: 'Fictional parent A', phone: '+12025550143', studentIds: [first._id] });
  await Guardian.create({
    refId: 'GRD-B',
    name: 'Fictional parent B',
    phone: '+12025550144',
    studentIds: [second._id],
  });
  const result = await request(app)
    .get(base + '/accounts/directory')
    .query({ grade: 'Grade 7 · A' })
    .set(admin.h);
  expect(result.status).toBe(200);
  expect(result.body.data.students.map((s: { refId: string }) => s.refId)).toEqual(['CLASS-01']);
  expect(result.body.data.guardians.map((g: { refId: string }) => g.refId)).toEqual(['GRD-A']);
  expect(result.body.data.classes).toEqual(['Grade 7 · A', 'Grade 8 · B']);
  const search = await request(app)
    .get(base + '/accounts/directory')
    .query({ q: 'CLASS-02', grade: 'Grade 7 · A' })
    .set(admin.h);
  expect(search.body.data.students).toEqual([]);
  const empty = await request(app)
    .get(base + '/accounts/directory')
    .query({ grade: 'Grade 99 · Z' })
    .set(admin.h);
  expect(empty.body.data.students).toEqual([]);
  expect(empty.body.data.guardians).toEqual([]);
});

it('allows only Administrator to correct login identity with conflict protection and email session revocation', async () => {
  const admin = await account(),
    teacher = await account('Teacher');
  const old = await User.findById(teacher.id);
  const input = {
    name: 'Corrected Teacher Name',
    email: 'corrected.teacher@example.invalid',
    expectedUpdatedAt: old!.updatedAt.toISOString(),
    reason: 'Verified user correction request',
  };
  expect(
    (
      await request(app)
        .get(base + '/accounts/' + admin.id)
        .set(teacher.h)
    ).status,
  ).toBe(403);
  expect(
    (
      await request(app)
        .patch(base + '/accounts/' + teacher.id)
        .set(teacher.h)
        .send(input)
    ).status,
  ).toBe(403);
  const r = await request(app)
    .patch(base + '/accounts/' + teacher.id)
    .set(admin.h)
    .send(input);
  expect(r.status).toBe(200);
  expect(r.body.data.sessionRevoked).toBe(true);
  expect(r.body.data.user.name).toBe(input.name);
  expect(r.body.data.user.passwordHash).toBeUndefined();
  expect(
    (
      await request(app)
        .get(base + '/me')
        .set(teacher.h)
    ).status,
  ).toBe(401);
  expect(
    (
      await request(app)
        .post(base + '/login')
        .send({ role: 'Teacher', email: 'teacher@example.invalid', password: 'OriginalPass123' })
    ).status,
  ).toBe(401);
  const login = await request(app)
    .post(base + '/login')
    .send({ role: 'Teacher', email: input.email, password: 'OriginalPass123' });
  expect(login.status).toBe(200);
  expect(login.body.data.user.name).toBe(input.name);
  expect(
    (
      await request(app)
        .patch(base + '/accounts/' + teacher.id)
        .set(admin.h)
        .send(input)
    ).status,
  ).toBe(409);
  const current = await request(app)
    .get(base + '/accounts/' + teacher.id)
    .set(admin.h);
  expect(
    (
      await request(app)
        .patch(base + '/accounts/' + teacher.id)
        .set(admin.h)
        .send({ ...input, expectedUpdatedAt: current.body.data.updatedAt, email: 'administrator@example.invalid' })
    ).status,
  ).toBe(409);
  expect(
    (
      await request(app)
        .patch(base + '/accounts/' + teacher.id)
        .set(admin.h)
        .send({ ...input, expectedUpdatedAt: current.body.data.updatedAt, role: 'Administrator' })
    ).status,
  ).toBe(400);
});

it('admin corrections to student, employee and guardian school records appear in linked users profiles', async () => {
  const admin = await account(),
    learner = await account('Student'),
    teacher = await account('Teacher'),
    parent = await account('Parent');
  const s = await student();
  await Student.updateOne({ _id: s._id }, { $set: { studentUserId: learner.id, guardianUserId: parent.id } });
  const employee = await Staff.create({
    refId: 'EMP-EDIT',
    name: 'Fictional teacher',
    designation: 'Teacher',
    department: 'Science',
    type: 'Teaching',
    email: 'teacher@example.invalid',
    phone: '+12025550143',
    joinedDate: new Date(),
    userId: teacher.id,
  });
  const guardian = await Guardian.create({
    refId: 'GRD-EDIT',
    name: 'Fictional parent',
    phone: '+12025550143',
    studentIds: [s._id],
    userId: parent.id,
  });
  expect(
    (
      await request(app)
        .patch('/api/v1/students/' + s._id)
        .set(admin.h)
        .send({ name: 'Corrected learner', address: 'Corrected fictional address' })
    ).status,
  ).toBe(200);
  expect(
    (
      await request(app)
        .patch('/api/v1/staff/' + employee._id)
        .set(admin.h)
        .send({
          designation: 'Senior teacher',
          phone: '+12025550145',
          expectedUpdatedAt: employee.updatedAt.toISOString(),
          changeReason: 'Verified correction',
        })
    ).status,
  ).toBe(200);
  expect(
    (
      await request(app)
        .patch('/api/v1/guardians/' + guardian._id)
        .set(admin.h)
        .send({
          name: 'Corrected parent',
          relation: 'Parent',
          phone: '+12025550146',
          email: 'contact.parent@example.invalid',
          studentIds: [String(s._id)],
          pickupAuthorized: false,
          financialResponsible: false,
          custody: 'Not recorded',
          consents: { media: null, trips: null, medical: null },
          expectedUpdatedAt: guardian.updatedAt.toISOString(),
        })
    ).status,
  ).toBe(200);
  const learnerProfile = await request(app)
    .get(base + '/profile')
    .set(learner.h);
  expect(learnerProfile.body.data.students[0].address).toBe('Corrected fictional address');
  expect(learnerProfile.body.data.students[0].name).toBe('Corrected learner');
  const teacherProfile = await request(app)
    .get(base + '/profile')
    .set(teacher.h);
  expect(teacherProfile.body.data.staff.designation).toBe('Senior teacher');
  expect(teacherProfile.body.data.staff.phone).toBe('+12025550145');
  const parentProfile = await request(app)
    .get(base + '/profile')
    .set(parent.h);
  expect(parentProfile.body.data.guardian.name).toBe('Corrected parent');
  expect(parentProfile.body.data.guardian.phone).toBe('+12025550146');
});

it.each(['Administrator', 'Principal', 'Teacher', 'Accountant', 'Parent', 'Student'])(
  'requires the matching selected role for %s accounts',
  async (role) => {
    const a = await account(role);
    for (const selected of ['Administrator', 'Principal', 'Teacher', 'Accountant', 'Parent', 'Student']) {
      const response = await request(app)
        .post(base + '/login')
        .send({ email: role.toLowerCase() + '@example.invalid', password: 'OriginalPass123', role: selected });
      expect(response.status).toBe(selected === role ? 200 : 401);
      if (selected !== role) expect(response.body.data?.accessToken).toBeUndefined();
    }
    expect(
      (
        await request(app)
          .post(base + '/login')
          .send({ email: role.toLowerCase() + '@example.invalid', password: 'OriginalPass123' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post(base + '/login')
          .send({ email: role.toLowerCase() + '@example.invalid', password: 'OriginalPass123', role: 'Superuser' })
      ).status,
    ).toBe(400);
    expect(a.id).toBeTruthy();
  },
);
it('keeps legacy IDs working and does not recycle previously issued readable IDs', async () => {
  const admin = await account(),
    s = await student('PERMANENT-001');
  const created = await provision(admin, 'Student', String(s._id));
  expect(created.status).toBe(201);
  const id = created.body.data.loginId;
  const upper = await request(app)
    .post(base + '/login')
    .send({ email: id.toUpperCase(), password: created.body.data.temporaryPassword, role: 'Student' });
  expect(upper.status).toBe(200);
  await User.deleteOne({ _id: created.body.data.userId });
  await Student.deleteOne({ _id: s._id });
  const replacement = await student('PERMANENT-001');
  expect((await provision(admin, 'Student', String(replacement._id))).status).toBe(409);
  const legacy = await account('Teacher');
  await User.updateOne({ _id: legacy.id }, { $set: { loginId: 'teacher-legacy-123' } });
  expect(
    (
      await request(app)
        .post(base + '/login')
        .send({ email: 'TEACHER-LEGACY-123', password: 'OriginalPass123', role: 'Teacher' })
    ).status,
  ).toBe(200);
  expect((await User.findById(legacy.id))!.loginId).toBe('teacher-legacy-123');
});

it('supports ID-only provisioning without silently taking the guardian contact email', async () => {
  const admin = await account(),
    child = await student('OPTIONAL-01');
  const guardian = await Guardian.create({
    refId: 'GRD-OPTIONAL',
    name: 'Fictional guardian',
    email: 'shared.contact@example.invalid',
    phone: '+12025550143',
    studentIds: [child._id],
  });
  const result = await provision(admin, 'Guardian', String(guardian._id));
  expect(result.status).toBe(201);
  expect(result.body.data.email).toMatch(/@accounts\.schoolos\.invalid$/);
  expect((await Guardian.findById(guardian._id))!.email).toBe('shared.contact@example.invalid');
  const internal = await request(app)
    .post(base + '/login')
    .send({ email: result.body.data.email, password: result.body.data.temporaryPassword, role: 'Parent' });
  expect(internal.status).toBe(401);
  const idLogin = await request(app)
    .post(base + '/login')
    .send({ email: result.body.data.loginId, password: result.body.data.temporaryPassword, role: 'Parent' });
  expect(idLogin.status).toBe(200);
  const { recipientContact } = await import('../src/modules/notifications/notifications.service');
  await expect(recipientContact(result.body.data.email, 'Email')).rejects.toMatchObject({ statusCode: 400 });
});
it('rejects parent contact emails for a student login and keeps email unique across roles', async () => {
  const admin = await account(),
    child = await student('OPTIONAL-02');
  await Student.updateOne({ _id: child._id }, { $set: { guardianEmail: 'parent.contact@example.invalid' } });
  expect(
    (await provision(admin, 'Student', String(child._id), { email: 'parent.contact@example.invalid' })).status,
  ).toBe(400);
  const created = await provision(admin, 'Student', String(child._id), { email: 'student.own@example.invalid' });
  expect(created.status).toBe(201);
  expect(created.body.data.email).toBe('student.own@example.invalid');
  const guardian = await Guardian.create({
    refId: 'GRD-EMAIL',
    name: 'Fictional guardian',
    phone: '+12025550143',
    studentIds: [],
  });
  expect(
    (await provision(admin, 'Guardian', String(guardian._id), { email: 'STUDENT.OWN@example.invalid' })).status,
  ).toBe(409);
  expect(
    (await provision(admin, 'Guardian', String(guardian._id), { email: 'another@accounts.schoolos.invalid' })).status,
  ).toBe(400);
  expect((await provision(admin, 'Guardian', String(guardian._id))).status).toBe(201);
});

it('previews roll-based IDs, exposes only student-own email, and preserves issued IDs after promotion', async () => {
  const admin = await account(), child = await student('TIMESTAMP-1791461567403');
  const updated = await request(app).patch('/api/v1/students/' + child._id).set(admin.h)
    .send({ studentEmail: 'learner@example.invalid', guardianEmail: 'parent@example.invalid' });
  expect(updated.status).toBe(200);
  const directory = await request(app).get(base + '/accounts/directory').set(admin.h);
  const row = directory.body.data.students.find((s: { _id: string }) => s._id === String(child._id));
  expect(row.proposedLoginId).toBe('SCH-STU-2026-7A-001');
  expect(row.studentEmail).toBe('learner@example.invalid');
  expect(row.guardianEmail).toBeUndefined();
  const issued = await provision(admin, 'Student', String(child._id), { email: row.studentEmail });
  expect(issued.status).toBe(201);
  expect(issued.body.data.email).toBe('learner@example.invalid');
  await Student.updateOne({ _id: child._id }, { $set: { grade: 'Grade 8 · B', roll: '2' } });
  expect((await User.findById(issued.body.data.userId))!.loginId).toBe('sch-stu-2026-7a-001');
  const duplicate = await student('ANOTHER-REFERENCE');
  expect((await provision(admin, 'Student', String(duplicate._id))).status).toBe(409);
  await Student.updateOne({ _id: duplicate._id }, { $set: { grade: 'Grade 7 · B' } });
  expect((await provision(admin, 'Student', String(duplicate._id))).status).toBe(201);
});
