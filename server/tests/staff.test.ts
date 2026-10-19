import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Principal' | 'Teacher', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
}

const validStaff = {
  refId: 'EMP-209',
  name: 'Rohan Mehta',
  designation: 'Mathematics Teacher',
  department: 'Mathematics',
  type: 'Teaching',
  email: 'rohan.mehta@alnoor.ae',
  phone: '+971502223344',
  joinedDate: '2020-08-15',
};

describe('Staff API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/staff');
    expect(res.status).toBe(401);
  });

  it('rejects staff creation by a Teacher (only Administrator/Principal may create)', async () => {
    const { token } = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const res = await request(app).post('/api/v1/staff').set('Authorization', `Bearer ${token}`).send(validStaff);
    expect(res.status).toBe(403);
  });

  it('allows staff creation by Administrator', async () => {
    const { token } = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const res = await request(app).post('/api/v1/staff').set('Authorization', `Bearer ${token}`).send(validStaff);
    expect(res.status).toBe(201);
    expect(res.body.data.refId).toBe('EMP-209');
  });

  it('rejects a duplicate refId with 409', async () => {
    const { token } = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    await request(app).post('/api/v1/staff').set('Authorization', `Bearer ${token}`).send(validStaff);
    const res = await request(app)
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validStaff, email: 'other@alnoor.ae' });
    expect(res.status).toBe(409);
  });

  it('rejects a duplicate email with 409 even if refId differs', async () => {
    const { token } = await registerAndLogin('Administrator', 'admin3@alnoor.ae');
    await request(app).post('/api/v1/staff').set('Authorization', `Bearer ${token}`).send(validStaff);
    const res = await request(app)
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validStaff, refId: 'EMP-999' });
    expect(res.status).toBe(409);
  });

  it('a Teacher only sees their own linked staff record in the list, not the full directory', async () => {
    const admin = await registerAndLogin('Administrator', 'admin4@alnoor.ae');
    await request(app).post('/api/v1/staff').set('Authorization', `Bearer ${admin.token}`).send(validStaff);
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const res = await request(app).get('/api/v1/staff').set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0); // not linked via userId, so scoped to nothing
  });

  it('Administrator sees the full staff directory', async () => {
    const admin = await registerAndLogin('Administrator', 'admin5@alnoor.ae');
    await request(app).post('/api/v1/staff').set('Authorization', `Bearer ${admin.token}`).send(validStaff);
    const res = await request(app).get('/api/v1/staff').set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('only Administrator can delete a staff record (Principal is rejected)', async () => {
    const admin = await registerAndLogin('Administrator', 'admin6@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(validStaff);
    const principal = await registerAndLogin('Principal', 'principal1@alnoor.ae');
    const res = await request(app)
      .delete(`/api/v1/staff/${created.body.data._id}`)
      .set('Authorization', `Bearer ${principal.token}`);
    expect(res.status).toBe(403);
  });

  it('Principal can update a staff record', async () => {
    const admin = await registerAndLogin('Administrator', 'admin7@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(validStaff);
    const principal = await registerAndLogin('Principal', 'principal2@alnoor.ae');
    const res = await request(app)
      .patch(`/api/v1/staff/${created.body.data._id}`)
      .set('Authorization', `Bearer ${principal.token}`)
      .send({
        status: 'On Leave',
        expectedUpdatedAt: created.body.data.updatedAt,
        changeReason: 'Recorded employment status change',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('On Leave');
  });

  it('links an existing portal account to a matching staff email, enabling self-service access', async () => {
    const admin = await registerAndLogin('Administrator', 'admin8@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'rohan.mehta@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(validStaff);
    expect(created.status).toBe(201);
    expect(created.body.data.userId).toBe(teacher.userId);
    const ownRecord = await request(app).get('/api/v1/staff').set('Authorization', `Bearer ${teacher.token}`);
    expect(ownRecord.body.data).toHaveLength(1);
    expect(ownRecord.body.data[0].refId).toBe(validStaff.refId);
  });

  it('does not delete staff that have operational leave history', async () => {
    const admin = await registerAndLogin('Administrator', 'admin9@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(validStaff);
    const { LeaveRequest } = await import('../src/models/LeaveRequest');
    await LeaveRequest.create({
      staff: created.body.data._id,
      fromDate: new Date('2026-07-06'),
      toDate: new Date('2026-07-06'),
      days: 1,
      reason: 'History',
    });
    const removed = await request(app)
      .delete(`/api/v1/staff/${created.body.data._id}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(removed.status).toBe(409);
  });

  it('persists required onboarding documents and checklist changes through the Staff API', async () => {
    const admin = await registerAndLogin('Administrator', 'admin10@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/staff')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ...validStaff, status: 'Onboarding' });
    const id = created.body.data._id;
    const uploaded = await request(app)
      .put(`/api/v1/staff/${id}/documents/id`)
      .set('Authorization', `Bearer ${admin.token}`)
      .set('Content-Type', 'application/pdf')
      .set('X-File-Name', 'passport.pdf')
      .send(Buffer.from('%PDF-test'));
    expect(uploaded.status).toBe(201);
    const task = await request(app)
      .post(`/api/v1/staff/${id}/onboarding/offer/toggle`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(task.status).toBe(200);
    const staff = await request(app).get(`/api/v1/staff/${id}`).set('Authorization', `Bearer ${admin.token}`);
    expect(staff.body.data.documents[0].filename).toBe('passport.pdf');
    expect(staff.body.data.onboarding.find((item: { key: string }) => item.key === 'offer').done).toBe(true);
  });
});
