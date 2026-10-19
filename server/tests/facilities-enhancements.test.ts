import request from 'supertest';
import { createApp } from '../src/app';
const app = createApp();
async function fixture() {
  const actor = (
    await request(app).post('/api/v1/auth/register').send({
      name: 'Fictional office',
      email: 'office@example.invalid',
      password: 'LocalFixture123!',
      role: 'Administrator',
    })
  ).body.data;
  const auth = 'Bearer ' + actor.accessToken;
  const venue = (
    await request(app)
      .post('/api/v1/facilities/facilities')
      .set('Authorization', auth)
      .send({ name: 'QA hall', type: 'Hall', capacity: 100 })
  ).body.data;
  const booking = async (date = '2026-11-01') =>
    request(app)
      .post('/api/v1/facilities/bookings')
      .set('Authorization', auth)
      .send({ facilityId: venue._id, date, startTime: '09:00', endTime: '10:00', purpose: 'QA meeting' });
  return { auth, venue, booking };
}
describe('Reviewed facility availability and reservation cancellation', () => {
  it('rejects impossible calendar dates and parses default list pagination', async () => {
    const f = await fixture();
    expect((await f.booking('2026-02-30')).status).toBe(400);
    await f.booking();
    const list = await request(app).get('/api/v1/facilities/bookings').set('Authorization', f.auth);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta.pagination.page).toBe(1);
  });
  it('maintenance review preserves history and blocks standalone and event reservations', async () => {
    const f = await fixture();
    const body = {
      name: 'QA hall',
      type: 'Hall',
      capacity: 100,
      status: 'Maintenance',
      reason: 'QA safety inspection',
      expectedUpdatedAt: f.venue.updatedAt,
    };
    const review = await request(app)
      .patch('/api/v1/facilities/facilities/' + f.venue._id)
      .set('Authorization', f.auth)
      .send(body);
    expect(review.status).toBe(200);
    expect(review.body.data.history[0].previous.status).toBe('Available');
    expect((await f.booking()).status).toBe(409);
    expect(
      (
        await request(app)
          .post('/api/v1/events')
          .set('Authorization', f.auth)
          .send({
            title: 'QA event',
            description: 'QA event description',
            date: '2026-11-01',
            audience: 'All',
            venue: { facilityId: f.venue._id, startTime: '09:00', endTime: '10:00' },
          })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app)
          .patch('/api/v1/facilities/facilities/' + f.venue._id)
          .set('Authorization', f.auth)
          .send(body)
      ).status,
    ).toBe(409);
  });
  it('cancellation is versioned and releases the slot once while retaining history', async () => {
    const f = await fixture(),
      booking = (await f.booking()).body.data;
    const body = { expectedUpdatedAt: booking.updatedAt, reason: 'QA meeting cancelled' };
    const path = '/api/v1/facilities/bookings/' + booking._id + '/cancel';
    const cancelled = await request(app).post(path).set('Authorization', f.auth).send(body);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.history[0].reason).toBe(body.reason);
    expect((await request(app).post(path).set('Authorization', f.auth).send(body)).status).toBe(409);
    expect((await f.booking()).status).toBe(201);
  });
  it('calendar-linked reservation must be cancelled through its event', async () => {
    const f = await fixture();
    const event = (
      await request(app)
        .post('/api/v1/events')
        .set('Authorization', f.auth)
        .send({
          title: 'QA linked event',
          description: 'QA linked event description',
          date: '2026-11-01',
          audience: 'All',
          venue: { facilityId: f.venue._id, startTime: '09:00', endTime: '10:00' },
        })
    ).body.data;
    const list = await request(app).get('/api/v1/facilities/bookings').set('Authorization', f.auth);
    const b = list.body.data[0];
    expect(
      (
        await request(app)
          .post('/api/v1/facilities/bookings/' + b._id + '/cancel')
          .set('Authorization', f.auth)
          .send({ expectedUpdatedAt: b.updatedAt, reason: 'QA attempted standalone cancellation' })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app)
          .post('/api/v1/events/' + event._id + '/cancel')
          .set('Authorization', f.auth)
          .send({ expectedUpdatedAt: event.updatedAt, reason: 'QA event cancelled' })
      ).status,
    ).toBe(200);
    expect((await f.booking()).status).toBe(201);
  });
  it('family cannot read private reservation purposes or contact identities', async () => {
    const f = await fixture();
    await f.booking();
    const parent = (
      await request(app).post('/api/v1/auth/register').send({
        name: 'Fictional parent',
        email: 'parent@example.invalid',
        password: 'LocalFixture123!',
        role: 'Parent',
      })
    ).body.data;
    expect(
      (
        await request(app)
          .get('/api/v1/facilities/bookings')
          .set('Authorization', 'Bearer ' + parent.accessToken)
      ).status,
    ).toBe(403);
  });
});
