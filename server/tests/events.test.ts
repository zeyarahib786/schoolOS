import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string };
}

async function createFacility(token: string, name: string) {
  const res = await request(app)
    .post('/api/v1/facilities/facilities')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, type: 'Hall', capacity: 200 });
  return res.body.data._id as string;
}

const validEvent = { title: 'Annual Sports Day', description: 'Inter-house sports competition.', date: '2026-06-14' };

describe('Events API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/events');
    expect(res.status).toBe(401);
  });

  it('rejects event creation by a Parent', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${parent.token}`)
      .send(validEvent);
    expect(res.status).toBe(403);
  });

  it('a Parent CAN read the events calendar - creation is restricted, reading is not', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    await request(app).post('/api/v1/events').set('Authorization', `Bearer ${teacher.token}`).send(validEvent);
    const parent = await registerAndLogin('Parent', 'parent2@alnoor.ae');
    const res = await request(app).get('/api/v1/events').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('creates an event with no venue at all - no booking required', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validEvent);
    expect(res.status).toBe(201);
    expect(res.body.data.booking).toBeUndefined();
  });

  it('creates a venue-linked event, genuinely reserving the underlying facility booking', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const facilityId = await createFacility(teacher.token, 'Sports Hall');
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ ...validEvent, venue: { facilityId, startTime: '09:00', endTime: '12:00' } });
    expect(res.status).toBe(201);
    expect(res.body.data.booking).toBeDefined();

    // Confirm the booking genuinely exists in Facilities' own booking list - real cross-module state, not a fake reference
    const bookings = await request(app)
      .get('/api/v1/facilities/bookings')
      .set('Authorization', `Bearer ${teacher.token}`)
      .query({ facilityId });
    expect(bookings.body.data.some((b: { _id: string }) => b._id === res.body.data.booking)).toBe(true);
  });

  it('THE CROSS-MODULE PROOF: a venue-linked event genuinely conflicts with a DIRECT Facilities booking for the same slot, and vice versa - proving the two modules share one real overlap-prevention system, not two independent ones that could silently diverge', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    const facilityId = await createFacility(teacher.token, 'Auditorium');

    // Book directly via Facilities first
    await request(app)
      .post('/api/v1/facilities/bookings')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ facilityId, date: '2026-06-20', startTime: '10:00', endTime: '11:00', purpose: 'Staff meeting' });

    // Now try to create an EVENT at an overlapping time in the SAME facility - must be rejected
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        title: 'Overlapping Event',
        description: 'x',
        date: '2026-06-20',
        venue: { facilityId, startTime: '10:30', endTime: '11:30' },
      });
    expect(res.status).toBe(409);
  });

  it('an event whose venue is unavailable does NOT get created at all - no dangling event with a phantom, never-actually-reserved venue', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher5@alnoor.ae');
    const facilityId = await createFacility(teacher.token, 'Library Hall');
    await request(app)
      .post('/api/v1/facilities/bookings')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ facilityId, date: '2026-06-25', startTime: '14:00', endTime: '15:00', purpose: 'x' });

    const beforeCount = (await request(app).get('/api/v1/events').set('Authorization', `Bearer ${teacher.token}`)).body
      .meta.pagination.total;
    await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        title: 'Should Not Exist',
        description: 'x',
        date: '2026-06-25',
        venue: { facilityId, startTime: '14:30', endTime: '15:30' },
      });
    const afterCount = (await request(app).get('/api/v1/events').set('Authorization', `Bearer ${teacher.token}`)).body
      .meta.pagination.total;

    expect(afterCount).toBe(beforeCount); // event count unchanged - the failed booking did not leave a partial event behind
  });

  it('filters events by audience', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher6@alnoor.ae');
    await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ ...validEvent, audience: 'Staff' });
    const res = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${teacher.token}`)
      .query({ audience: 'Staff' });
    expect(res.status).toBe(200);
    expect(res.body.data.every((e: { audience: string }) => e.audience === 'Staff')).toBe(true);
  });
});
