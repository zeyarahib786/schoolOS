import express from 'express';
import { registrationAccess } from '../src/modules/auth/registration-access';
import { errorHandler } from '../src/middleware/errorHandler';
import request from 'supertest';
import { createApp } from '../src/app';
import { Student } from '../src/models/Student';
import { Role } from '../src/types/roles';
const app = createApp();
const record = {
  refId: 'QA-001',
  name: 'QA Student',
  grade: 'Grade 7 · A',
  gender: 'Female',
  roll: '007',
  guardianName: 'QA Guardian',
  phone: '+971501234567',
  medicalNotes: 'Private note',
  guardianEmail: 'parent@example.invalid',
};
async function account(role: Role) {
  const email = role.toLowerCase() + '@example.invalid';
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'QA ' + role, email, password: 'StrongPass123', role });
  expect(res.status).toBe(201);
  return { token: res.body.data.accessToken as string, id: res.body.data.user._id as string, email };
}
const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
async function create(token: string, refId = 'QA-001') {
  const r = await request(app)
    .post('/api/v1/students')
    .set(headers(token))
    .send({ ...record, refId });
  expect(r.status).toBe(201);
  return r.body.data._id as string;
}
describe('Students enhanced management', () => {
  it('tests all six roles, real account links, ownership and denied mutations', async () => {
    const admin = await account('Administrator'),
      principal = await account('Principal'),
      teacher = await account('Teacher'),
      finance = await account('Accountant'),
      parent = await account('Parent'),
      pupil = await account('Student');
    const id = await create(admin.token),
      other = await create(admin.token, 'OTHER');
    expect(
      (
        await request(app)
          .patch(`/api/v1/students/${id}/accounts`)
          .set(headers(principal.token))
          .send({ parentEmail: parent.email, studentEmail: pupil.email })
      ).status,
    ).toBe(200);
    for (const user of [admin, principal, teacher, finance])
      expect(
        (await request(app).get('/api/v1/students?page=1&limit=100').set(headers(user.token))).body.data,
      ).toHaveLength(2);
    for (const user of [parent, pupil]) {
      expect(
        (await request(app).get('/api/v1/students?page=1&limit=100').set(headers(user.token))).body.data.map(
          (r: { _id: string }) => r._id,
        ),
      ).toEqual([id]);
      expect((await request(app).get(`/api/v1/students/${other}`).set(headers(user.token))).status).toBe(404);
      expect((await request(app).get(`/api/v1/students/${other}/documents/id`).set(headers(user.token))).status).toBe(
        404,
      );
    }
    for (const user of [teacher, finance, parent, pupil]) {
      expect(
        (
          await request(app)
            .patch(`/api/v1/students/${id}/accounts`)
            .set(headers(user.token))
            .send({ parentEmail: null })
        ).status,
      ).toBe(403);
      expect(
        (
          await request(app)
            .patch(`/api/v1/students/${id}/enrollment`)
            .set(headers(user.token))
            .send({ status: 'Inactive', reason: 'QA withdrawal', effectiveDate: '2020-01-01' })
        ).status,
      ).toBe(403);
      expect(
        (
          await request(app)
            .post('/api/v1/students/import')
            .set(headers(user.token))
            .send({ students: [{ ...record, refId: 'IMPORT' }] })
        ).status,
      ).toBe(403);
    }
    expect(
      (
        await request(app)
          .patch(`/api/v1/students/${id}`)
          .set(headers(teacher.token))
          .send({ guardianUserId: parent.id })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .patch(`/api/v1/students/${id}`)
          .set(headers(teacher.token))
          .send({ name: 'Updated by teacher' })
      ).status,
    ).toBe(200);
    for (const user of [finance, parent, pupil])
      expect(
        (await request(app).patch(`/api/v1/students/${id}`).set(headers(user.token)).send({ name: 'Denied' })).status,
      ).toBe(403);
    const read = await request(app).get(`/api/v1/students/${id}`).set(headers(finance.token));
    expect(read.status).toBe(200);
    expect(read.body.data.medicalNotes).toBeUndefined();
    expect(read.body.data.documents).toBeUndefined();
    expect((await request(app).get(`/api/v1/students/${id}/documents/id`).set(headers(finance.token))).status).toBe(
      403,
    );
    expect(
      (
        await request(app)
          .patch(`/api/v1/students/${id}/accounts`)
          .set(headers(admin.token))
          .send({ parentEmail: null, studentEmail: null })
      ).status,
    ).toBe(200);
    expect(
      (await request(app).get('/api/v1/students?page=1&limit=100').set(headers(parent.token))).body.data,
    ).toHaveLength(0);
  });
  it('rejects wrong-role links and a Student account assigned to two students', async () => {
    const admin = await account('Administrator'),
      pupil = await account('Student'),
      first = await create(admin.token),
      second = await create(admin.token, 'QA-002');
    expect(
      (
        await request(app)
          .patch(`/api/v1/students/${first}/accounts`)
          .set(headers(admin.token))
          .send({ parentEmail: admin.email })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch(`/api/v1/students/${first}/accounts`)
          .set(headers(admin.token))
          .send({ studentEmail: pupil.email })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .patch(`/api/v1/students/${second}/accounts`)
          .set(headers(admin.token))
          .send({ studentEmail: pupil.email })
      ).status,
    ).toBe(409);
  });
  it('imports atomically and rejects duplicate/invalid batches without partial saves', async () => {
    const admin = await account('Administrator');
    const result = await request(app)
      .post('/api/v1/students/import')
      .set(headers(admin.token))
      .send({ students: [record, { ...record, refId: 'qa-002' }] });
    expect(result.status).toBe(201);
    expect(result.body.data.count).toBe(2);
    expect(await Student.exists({ refId: 'QA-002' })).toBeTruthy();
    for (const rows of [
      [{ ...record, refId: 'NEW' }, record],
      [
        { ...record, refId: 'DUP' },
        { ...record, refId: 'dup' },
      ],
      [
        { ...record, refId: 'NEW' },
        { ...record, refId: 'BAD', phone: 'invalid' },
      ],
    ]) {
      const res = await request(app).post('/api/v1/students/import').set(headers(admin.token)).send({ students: rows });
      expect([400, 409]).toContain(res.status);
      expect(await Student.countDocuments()).toBe(2);
    }
  });
  it('preserves enrollment reasons and dates and supports clearing optional fields', async () => {
    const admin = await account('Administrator'),
      id = await create(admin.token);
    for (const status of ['Inactive', 'Active'])
      expect(
        (
          await request(app)
            .patch(`/api/v1/students/${id}/enrollment`)
            .set(headers(admin.token))
            .send({ status, reason: 'Enrollment update approved', effectiveDate: '2020-01-01' })
        ).status,
      ).toBe(200);
    expect(
      (
        await request(app)
          .patch(`/api/v1/students/${id}`)
          .set(headers(admin.token))
          .send({ clearFields: ['medicalNotes', 'guardianEmail'], address: 'Updated address' })
      ).status,
    ).toBe(200);
    const res = await request(app).get(`/api/v1/students/${id}`).set(headers(admin.token));
    expect(res.body.data.enrollmentHistory).toHaveLength(2);
    expect(res.body.data.enrollmentHistory[0]).toMatchObject({
      from: 'Active',
      to: 'Inactive',
      reason: 'Enrollment update approved',
    });
    expect(res.body.data.medicalNotes).toBeUndefined();
    expect(res.body.data.guardianEmail).toBeUndefined();
    expect(res.body.data.roll).toBe('007');
    expect(res.body.data.address).toBe('Updated address');
  });
});

describe('Students permission prerequisite: controlled account creation', () => {
  it('blocks public privilege creation with real JWT authentication outside fixture mode', async () => {
    const admin = await account('Administrator'),
      parent = await account('Parent');
    const protectedApp = express();
    protectedApp.use(express.json());
    protectedApp.post('/register', registrationAccess(false), (_req, res) => {
      res.status(201).json({ admitted: true });
    });
    protectedApp.use(errorHandler);
    expect((await request(protectedApp).post('/register').send({ role: 'Administrator' })).status).toBe(401);
    expect(
      (await request(protectedApp).post('/register').set(headers(parent.token)).send({ role: 'Administrator' })).status,
    ).toBe(403);
    expect(
      (await request(protectedApp).post('/register').set(headers(admin.token)).send({ role: 'Parent' })).status,
    ).toBe(201);
  });
});
