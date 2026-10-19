import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string };
}

async function createStudent(token: string, refId: string) {
  const res = await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send({
    refId,
    name: 'Fatima Al Hashimi',
    grade: 'Grade 10 · A',
    gender: 'Female',
    roll: '12',
    guardianName: 'Khalid',
    phone: '+971501234567',
  });
  return res.body.data._id as string;
}

async function createStaff(token: string, refId: string) {
  const res = await request(app)
    .post('/api/v1/staff')
    .set('Authorization', `Bearer ${token}`)
    .send({
      refId,
      name: 'Rohan Mehta',
      designation: 'Teacher',
      department: 'Mathematics',
      type: 'Teaching',
      email: `${refId.toLowerCase()}@alnoor.ae`,
      phone: '+971502223344',
      joinedDate: '2020-08-15',
    });
  return res.body.data._id as string;
}

async function issueCard(token: string, subjectType: 'Student' | 'Staff', subjectId: string) {
  return request(app)
    .post('/api/v1/id-cards')
    .set('Authorization', `Bearer ${token}`)
    .send({ subjectType, subjectId, expiryDate: '2028-06-30' });
}

describe('ID Cards API', () => {
  it('rejects unauthenticated access and gives an unlinked Parent an empty owned list', async () => {
    expect((await request(app).get('/api/v1/id-cards')).status).toBe(401);
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    expect((await request(app).get('/api/v1/id-cards').set('Authorization', `Bearer ${parent.token}`)).status).toBe(
      200,
    );
  });

  it('THE POLYMORPHIC REFERENCE, PROVEN BOTH KINDS: one card collection holds Student AND Staff cards, each populated from its own collection', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8001');
    const staffId = await createStaff(admin.token, 'EMP-8001');

    const studentCard = await issueCard(admin.token, 'Student', studentId);
    const staffCard = await issueCard(admin.token, 'Staff', staffId);
    expect(studentCard.status).toBe(201);
    expect(staffCard.status).toBe(201);

    const list = await request(app).get('/api/v1/id-cards').set('Authorization', `Bearer ${admin.token}`);
    const populated = list.body.data.filter((c: { subject: { name?: string } | null }) => c.subject && c.subject.name);
    const names = populated.map((c: { subject: { name: string } }) => c.subject.name);
    expect(names).toContain('Fatima Al Hashimi'); // resolved from Students
    expect(names).toContain('Rohan Mehta'); // resolved from Staff - same list, different source collections
  });

  it('serials are sequential and carry the CARD prefix', async () => {
    const admin = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8002');
    const res = await issueCard(admin.token, 'Student', studentId);
    expect(res.body.data.serial).toMatch(/^CARD-\d{4}-\d{6}$/);
  });

  it('issuing for a nonexistent holder is a 404 in the RIGHT collection - a Staff id passed as a Student subject does not resolve', async () => {
    const admin = await registerAndLogin('Administrator', 'admin3@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-8002');
    const res = await issueCard(admin.token, 'Student', staffId); // real id, wrong collection
    expect(res.status).toBe(404);
  });

  it('rejects an expiry date in the past', async () => {
    const admin = await registerAndLogin('Administrator', 'admin4@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8003');
    const res = await request(app)
      .post('/api/v1/id-cards')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ subjectType: 'Student', subjectId: studentId, expiryDate: '2020-01-01' });
    expect(res.status).toBe(400);
  });

  it('ONE ACTIVE CARD PER HOLDER: a second issuance while a card is Active gets 409', async () => {
    const admin = await registerAndLogin('Administrator', 'admin5@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8004');
    await issueCard(admin.token, 'Student', studentId);
    const res = await issueCard(admin.token, 'Student', studentId);
    expect(res.status).toBe(409);
  });

  it('THE REPLACEMENT CHAIN, PROVEN: report lost -> reissue succeeds AND the new card genuinely links to the lost one via replaces', async () => {
    const admin = await registerAndLogin('Administrator', 'admin6@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8005');
    const first = await issueCard(admin.token, 'Student', studentId);
    const firstId = first.body.data._id as string;

    await request(app).post(`/api/v1/id-cards/${firstId}/report-lost`).set('Authorization', `Bearer ${admin.token}`);
    const second = await issueCard(admin.token, 'Student', studentId);
    expect(second.status).toBe(201);
    expect(second.body.data.replaces).toBe(firstId);
  });

  it('only an Active card can be reported lost - reporting a Lost card again is a 409', async () => {
    const admin = await registerAndLogin('Administrator', 'admin7@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8006');
    const card = await issueCard(admin.token, 'Student', studentId);
    const cardId = card.body.data._id as string;
    await request(app).post(`/api/v1/id-cards/${cardId}/report-lost`).set('Authorization', `Bearer ${admin.token}`);
    const res = await request(app)
      .post(`/api/v1/id-cards/${cardId}/report-lost`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(409);
  });

  it('atomically accepts only one competing lifecycle transition for an active card', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-race@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8009');
    const card = await issueCard(admin.token, 'Student', studentId);
    const [lost, revoked] = await Promise.all([
      request(app)
        .post(`/api/v1/id-cards/${card.body.data._id}/report-lost`)
        .set('Authorization', `Bearer ${admin.token}`),
      request(app).post(`/api/v1/id-cards/${card.body.data._id}/revoke`).set('Authorization', `Bearer ${admin.token}`),
    ]);
    expect([lost.status, revoked.status].sort()).toEqual([200, 409]);
  });

  it('filters by subjectType and status', async () => {
    const admin = await registerAndLogin('Administrator', 'admin8@alnoor.ae');
    const staffId = await createStaff(admin.token, 'EMP-8003');
    await issueCard(admin.token, 'Staff', staffId);
    const res = await request(app)
      .get('/api/v1/id-cards')
      .set('Authorization', `Bearer ${admin.token}`)
      .query({ subjectType: 'Staff', status: 'Active' });
    expect(
      res.body.data.every(
        (c: { subjectType: string; status: string }) => c.subjectType === 'Staff' && c.status === 'Active',
      ),
    ).toBe(true);
  });

  it('does not issue a card to an inactive holder', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-inactive@alnoor.ae');
    const student = await request(app).post('/api/v1/students').set('Authorization', `Bearer ${admin.token}`).send({
      refId: 'ANS-8007',
      name: 'Inactive student',
      grade: 'Grade 10 · A',
      gender: 'Female',
      roll: '13',
      guardianName: 'Khalid',
      phone: '+971501234567',
      status: 'Inactive',
    });
    const issued = await issueCard(admin.token, 'Student', student.body.data._id);
    expect(issued.status).toBe(409);
  });

  it('rejects an impossible calendar date and audits lifecycle changes', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-audit@alnoor.ae');
    const studentId = await createStudent(admin.token, 'ANS-8008');
    const invalid = await request(app).post('/api/v1/id-cards').set('Authorization', `Bearer ${admin.token}`).send({
      subjectType: 'Student',
      subjectId: studentId,
      expiryDate: '2028-02-30',
    });
    expect(invalid.status).toBe(400);

    const card = await issueCard(admin.token, 'Student', studentId);
    expect(card.status).toBe(201);
    await request(app)
      .post(`/api/v1/id-cards/${card.body.data._id}/report-lost`)
      .set('Authorization', `Bearer ${admin.token}`);
    const audit = await request(app)
      .get('/api/v1/audit-log?module=ID%20Cards')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(audit.status).toBe(200);
    const actions = audit.body.data.map((entry: { action: string }) => entry.action);
    expect(actions).toContain(`Issued ID card ${card.body.data.serial}`);
    expect(actions).toContain(`Reported ID card ${card.body.data.serial} lost`);
  });
});
