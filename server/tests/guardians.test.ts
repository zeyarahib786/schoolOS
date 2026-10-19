import request from 'supertest';
import { createApp } from '../src/app';
import { Guardian } from '../src/models/Guardian';
import { Student } from '../src/models/Student';

const app = createApp();

async function account(role: 'Administrator' | 'Principal' | 'Teacher', email: string) {
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Guardian ${role}`, email, password: 'StrongPass123', role });
  return response.body.data.accessToken as string;
}

async function fixture() {
  const student = await Student.create({
    refId: 'ANS-G01',
    name: 'Guardian Child',
    grade: 'Grade 4 · A',
    gender: 'Female',
    roll: '4',
    guardianName: 'Test Guardian',
    phone: '+971501112233',
    feeStatus: 'Paid',
    attendancePct: 95,
    gpa: 3.5,
  });
  const parent = await request(app).post('/api/v1/auth/register').send({
    name: 'Fixture Parent',
    email: 'fixture-parent@example.invalid',
    password: 'StrongPass123',
    role: 'Parent',
  });
  const guardian = await Guardian.create({
    userId: parent.body.data.user._id,
    refId: 'GRD-901',
    name: 'Test Guardian',
    relation: 'Parent',
    phone: '+971501112233',
    email: 'guardian.fixture@family.ae',
    studentIds: [student._id],
    portalStatus: 'Invited',
    pickupAuthorized: true,
    financialResponsible: true,
    custody: 'Full',
    consents: { media: true, trips: true, medical: true },
  });
  return { student, guardian };
}

describe('Guardians / Parents API', () => {
  it('requires authentication and the same leadership roles as the Parents UI', async () => {
    expect((await request(app).get('/api/v1/guardians')).status).toBe(401);
    const teacher = await account('Teacher', 'guardian-teacher@alnoor.ae');
    expect((await request(app).get('/api/v1/guardians').set('Authorization', `Bearer ${teacher}`)).status).toBe(403);
  });

  it('lists real guardian profiles with their linked children', async () => {
    const admin = await account('Administrator', 'guardian-admin1@alnoor.ae');
    await fixture();
    const response = await request(app).get('/api/v1/guardians').set('Authorization', `Bearer ${admin}`);
    expect(response.status).toBe(200);
    expect(response.body.data[0].studentIds[0]).toMatchObject({ refId: 'ANS-G01', name: 'Guardian Child' });
  });

  it('activates and suspends portal access persistently', async () => {
    const admin = await account('Administrator', 'guardian-admin2@alnoor.ae');
    const { guardian } = await fixture();
    const active = await request(app)
      .patch(`/api/v1/guardians/${guardian._id}/portal`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'Active' });
    expect(active.status).toBe(200);
    expect(active.body.data.portalStatus).toBe('Active');
    const suspended = await request(app)
      .patch(`/api/v1/guardians/${guardian._id}/portal`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'Suspended' });
    expect(suspended.body.data.portalStatus).toBe('Suspended');
  });

  it('validates audience-specific broadcast fields', async () => {
    const principal = await account('Principal', 'guardian-principal@alnoor.ae');
    const response = await request(app)
      .post('/api/v1/guardians/broadcasts')
      .set('Authorization', `Bearer ${principal}`)
      .send({
        audience: 'By grade',
        channel: 'In-app only',
        subject: 'Grade notice',
        message: 'Please review this notice.',
      });
    expect(response.status).toBe(400);
  });

  it('persists a targeted broadcast and places it in the guardian thread atomically', async () => {
    const admin = await account('Administrator', 'guardian-admin3@alnoor.ae');
    const { guardian } = await fixture();
    const sent = await request(app).post('/api/v1/guardians/broadcasts').set('Authorization', `Bearer ${admin}`).send({
      audience: 'Individual guardian',
      guardianId: guardian._id.toString(),
      channel: 'In-app only',
      subject: 'Fee reminder',
      message: 'Your fee statement is ready.',
    });
    expect(sent.status).toBe(201);
    expect(sent.body.data.recipientCount).toBe(1);
    const thread = await request(app)
      .get(`/api/v1/guardians/${guardian._id}/messages`)
      .set('Authorization', `Bearer ${admin}`);
    expect(thread.body.data).toHaveLength(1);
    expect(thread.body.data[0].text).toBe('Your fee statement is ready.');
  });

  it('resolves grade and class selectors from the existing Parents UI', async () => {
    const admin = await account('Administrator', 'guardian-admin-targets@alnoor.ae');
    const { guardian } = await fixture();
    for (const [audience, field] of [
      ['By grade', { grade: 'Grade 4' }],
      ['Single class', { className: '4-A' }],
    ] as const) {
      const sent = await request(app)
        .post('/api/v1/guardians/broadcasts')
        .set('Authorization', `Bearer ${admin}`)
        .send({
          audience,
          ...field,
          channel: 'In-app only',
          subject: 'Targeted notice',
          message: 'School notice.',
        });
      expect(sent.status).toBe(201);
      expect(sent.body.data.recipientCount).toBe(1);
    }
    const thread = await request(app)
      .get(`/api/v1/guardians/${guardian._id}/messages`)
      .set('Authorization', `Bearer ${admin}`);
    expect(thread.body.data).toHaveLength(2);
  });

  it('does not claim email or SMS delivery without a configured transport', async () => {
    const admin = await account('Administrator', 'guardian-admin-external@alnoor.ae');
    const { guardian } = await fixture();
    const sent = await request(app).post('/api/v1/guardians/broadcasts').set('Authorization', `Bearer ${admin}`).send({
      audience: 'Individual guardian',
      guardianId: guardian._id.toString(),
      channel: 'SMS + Email',
      subject: 'External delivery unavailable',
      message: 'This must stay unsent.',
    });
    expect(sent.status).toBe(400);
    const thread = await request(app)
      .get(`/api/v1/guardians/${guardian._id}/messages`)
      .set('Authorization', `Bearer ${admin}`);
    expect(thread.body.data).toHaveLength(0);
  });

  it('persists a direct guardian-thread reply and rejects unknown guardians', async () => {
    const admin = await account('Administrator', 'guardian-admin4@alnoor.ae');
    const { guardian } = await fixture();
    const sent = await request(app)
      .post(`/api/v1/guardians/${guardian._id}/messages`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ text: 'Thank you for confirming.' });
    expect(sent.status).toBe(201);
    const missing = await request(app)
      .post('/api/v1/guardians/64b7f9c9a1b2c3d4e5f60789/messages')
      .set('Authorization', `Bearer ${admin}`)
      .send({ text: 'Hello' });
    expect(missing.status).toBe(404);
  });
});
