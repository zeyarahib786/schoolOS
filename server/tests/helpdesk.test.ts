import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
}

async function createStaff(token: string, refId: string) {
  const res = await request(app)
    .post('/api/v1/staff')
    .set('Authorization', `Bearer ${token}`)
    .send({
      refId,
      name: 'IT Support',
      designation: 'IT Technician',
      department: 'IT',
      type: 'Non-Teaching',
      email: `${refId.toLowerCase()}@alnoor.ae`,
      phone: '+971502223344',
      joinedDate: '2020-08-15',
    });
  return res.body.data._id as string;
}

const validTicket = {
  category: 'IT',
  subject: 'Projector not working',
  description: 'The projector in Room 12 will not turn on.',
};

describe('Helpdesk API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/helpdesk');
    expect(res.status).toBe(401);
  });

  it('allows a Parent to raise a ticket - creation is open to every role, unlike every other module', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/helpdesk')
      .set('Authorization', `Bearer ${parent.token}`)
      .send(validTicket);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Open');
  });

  it('rejects a Parent transitioning a ticket - only support roles may resolve', async () => {
    const parent = await registerAndLogin('Parent', 'parent2@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/helpdesk')
      .set('Authorization', `Bearer ${parent.token}`)
      .send(validTicket);
    const res = await request(app)
      .post(`/api/v1/helpdesk/${created.body.data._id}/transition`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ status: 'Assigned' });
    expect(res.status).toBe(403);
  });

  it('THE STATE MACHINE, END TO END: rejects jumping straight from Open to Resolved, even for a support role', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/helpdesk')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validTicket);
    const res = await request(app)
      .post(`/api/v1/helpdesk/${created.body.data._id}/transition`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ status: 'Resolved' });
    expect(res.status).toBe(400);
  });

  it('walks a ticket through its full correct lifecycle: Open -> Assigned -> Resolved -> Closed', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-helpdesk1@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-701');
    const created = await request(app)
      .post('/api/v1/helpdesk')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validTicket);
    const id = created.body.data._id;

    const assigned = await request(app)
      .post(`/api/v1/helpdesk/${id}/transition`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ status: 'Assigned', assignedTo: staffId });
    expect(assigned.status).toBe(200);
    expect(assigned.body.data.status).toBe('Assigned');

    const resolved = await request(app)
      .post(`/api/v1/helpdesk/${id}/transition`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ status: 'Resolved', resolutionNotes: 'Replaced the bulb.' });
    expect(resolved.status).toBe(200);

    const closed = await request(app)
      .post(`/api/v1/helpdesk/${id}/transition`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ status: 'Closed' });
    expect(closed.status).toBe(200);
    expect(closed.body.data.status).toBe('Closed');
  });

  it('rejects reopening a CLOSED ticket - closed is genuinely terminal, verified through the real API not just the pure function', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-helpdesk2@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-702');
    const created = await request(app)
      .post('/api/v1/helpdesk')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validTicket);
    const id = created.body.data._id;
    await request(app)
      .post(`/api/v1/helpdesk/${id}/transition`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ status: 'Assigned', assignedTo: staffId });
    await request(app)
      .post(`/api/v1/helpdesk/${id}/transition`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ status: 'Resolved' });
    await request(app)
      .post(`/api/v1/helpdesk/${id}/transition`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ status: 'Closed' });

    const res = await request(app)
      .post(`/api/v1/helpdesk/${id}/transition`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ status: 'Open' });
    expect(res.status).toBe(400);
  });

  it('rejects moving to Assigned without an assignedTo when none is already set', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/helpdesk')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validTicket);
    const res = await request(app)
      .post(`/api/v1/helpdesk/${created.body.data._id}/transition`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ status: 'Assigned' });
    expect(res.status).toBe(400);
  });

  it('a Parent sees only tickets they personally raised', async () => {
    const parentA = await registerAndLogin('Parent', 'parent3@alnoor.ae');
    const parentB = await registerAndLogin('Parent', 'parent4@alnoor.ae');
    await request(app).post('/api/v1/helpdesk').set('Authorization', `Bearer ${parentA.token}`).send(validTicket);
    await request(app).post('/api/v1/helpdesk').set('Authorization', `Bearer ${parentB.token}`).send(validTicket);

    const res = await request(app).get('/api/v1/helpdesk').set('Authorization', `Bearer ${parentA.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('a Teacher (support role) sees ALL tickets, including ones raised by a Parent', async () => {
    const parent = await registerAndLogin('Parent', 'parent5@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher5@alnoor.ae');
    await request(app).post('/api/v1/helpdesk').set('Authorization', `Bearer ${parent.token}`).send(validTicket);

    const res = await request(app).get('/api/v1/helpdesk').set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects assigning a ticket to a missing or inactive staff record', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-helpdesk-assignee@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher-helpdesk-assignee@alnoor.ae');
    const created = await request(app).post('/api/v1/helpdesk').set('Authorization', `Bearer ${teacher.token}`).send(validTicket);
    const missing = await request(app).post(`/api/v1/helpdesk/${created.body.data._id}/transition`).set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'Assigned', assignedTo: '64b7f9c9a1b2c3d4e5f60789' });
    expect(missing.status).toBe(400);

    const inactive = await request(app).post('/api/v1/staff').set('Authorization', `Bearer ${admin.token}`).send({
      refId: 'EMP-HELPDESK-INACTIVE', name: 'Inactive Technician', designation: 'IT Technician', department: 'IT', type: 'Non-Teaching',
      email: 'inactive-helpdesk@alnoor.ae', phone: '+971502223344', joinedDate: '2020-08-15', status: 'Inactive',
    });
    const rejected = await request(app).post(`/api/v1/helpdesk/${created.body.data._id}/transition`).set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'Assigned', assignedTo: inactive.body.data._id });
    expect(rejected.status).toBe(409);
  });

  it('CONCURRENT assignment attempts permit exactly one state transition', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-helpdesk-concurrent@alnoor.ae');
    const teacher = await registerAndLogin('Teacher', 'teacher-helpdesk-concurrent@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-HELPDESK-CONCURRENT');
    const created = await request(app).post('/api/v1/helpdesk').set('Authorization', `Bearer ${teacher.token}`).send(validTicket);
    const [first, second] = await Promise.all([
      request(app).post(`/api/v1/helpdesk/${created.body.data._id}/transition`).set('Authorization', `Bearer ${admin.token}`).send({ status: 'Assigned', assignedTo: staffId }),
      request(app).post(`/api/v1/helpdesk/${created.body.data._id}/transition`).set('Authorization', `Bearer ${admin.token}`).send({ status: 'Assigned', assignedTo: staffId }),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
  });
});
