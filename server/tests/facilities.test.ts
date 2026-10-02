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
    .send({ name, type: 'Meeting Room', capacity: 10 });
  return res.body.data._id as string;
}

describe('Facilities API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/facilities/bookings');
    expect(res.status).toBe(401);
  });

  it('rejects booking by a Parent', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const facilityId = await createFacility(admin.token, 'Room A');
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/facilities/bookings')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ facilityId, date: '2026-06-14', startTime: '09:00', endTime: '10:00', purpose: 'x' });
    expect(res.status).toBe(403);
  });

  it('allows a Teacher to book an available slot', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const facilityId = await createFacility(teacher.token, 'Room B');
    const res = await request(app)
      .post('/api/v1/facilities/bookings')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ facilityId, date: '2026-06-14', startTime: '09:00', endTime: '10:00', purpose: 'Staff meeting' });
    expect(res.status).toBe(201);
  });

  it('rejects a genuinely overlapping booking for the same facility/date', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const facilityId = await createFacility(teacher.token, 'Room C');
    await request(app)
      .post('/api/v1/facilities/bookings')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ facilityId, date: '2026-06-14', startTime: '09:00', endTime: '10:00', purpose: 'x' });
    const res = await request(app)
      .post('/api/v1/facilities/bookings')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ facilityId, date: '2026-06-14', startTime: '09:30', endTime: '10:30', purpose: 'y' });
    expect(res.status).toBe(409);
  });

  it('allows a back-to-back booking that only TOUCHES the prior one, not overlaps it', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const facilityId = await createFacility(teacher.token, 'Room D');
    await request(app)
      .post('/api/v1/facilities/bookings')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ facilityId, date: '2026-06-14', startTime: '09:00', endTime: '10:00', purpose: 'x' });
    const res = await request(app)
      .post('/api/v1/facilities/bookings')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ facilityId, date: '2026-06-14', startTime: '10:00', endTime: '11:00', purpose: 'y' });
    expect(res.status).toBe(201);
  });

  it('allows the SAME time slot on a DIFFERENT date for the same facility', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    const facilityId = await createFacility(teacher.token, 'Room E');
    await request(app)
      .post('/api/v1/facilities/bookings')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ facilityId, date: '2026-06-14', startTime: '09:00', endTime: '10:00', purpose: 'x' });
    const res = await request(app)
      .post('/api/v1/facilities/bookings')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ facilityId, date: '2026-06-15', startTime: '09:00', endTime: '10:00', purpose: 'y' });
    expect(res.status).toBe(201);
  });

  it('CONCURRENCY: two simultaneous requests for the exact same slot - exactly one succeeds, never both, proving the transaction actually prevents the race', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher5@alnoor.ae');
    const facilityId = await createFacility(teacher.token, 'Room F');
    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/v1/facilities/bookings')
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({ facilityId, date: '2026-06-20', startTime: '14:00', endTime: '15:00', purpose: 'A' }),
      request(app)
        .post('/api/v1/facilities/bookings')
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({ facilityId, date: '2026-06-20', startTime: '14:00', endTime: '15:00', purpose: 'B' }),
    ]);
    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it('a DIFFERENT facility is unaffected by a booking on another facility at the same time', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher6@alnoor.ae');
    const facilityX = await createFacility(teacher.token, 'Room X');
    const facilityY = await createFacility(teacher.token, 'Room Y');
    await request(app)
      .post('/api/v1/facilities/bookings')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ facilityId: facilityX, date: '2026-06-14', startTime: '09:00', endTime: '10:00', purpose: 'x' });
    const res = await request(app)
      .post('/api/v1/facilities/bookings')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ facilityId: facilityY, date: '2026-06-14', startTime: '09:00', endTime: '10:00', purpose: 'y' });
    expect(res.status).toBe(201);
  });
});
