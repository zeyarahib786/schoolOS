import request from 'supertest';
import { createApp } from '../src/app';
import { Route } from '../src/models/Route';
import { Vehicle } from '../src/models/Vehicle';
const app = createApp();
async function fixture() {
  const account = async (role: string) => {
    const r = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'QA ' + role, email: role.toLowerCase() + '@example.invalid', password: 'StrongPass123', role });
    return { h: { Authorization: 'Bearer ' + r.body.data.accessToken }, id: r.body.data.user._id };
  };
  const admin = await account('Administrator'),
    parent = await account('Parent'),
    student = await account('Student');
  const child = (
    await request(app).post('/api/v1/students').set(admin.h).send({
      refId: 'QA-TRANS-1',
      name: 'QA own child',
      grade: 'Grade 7 · A',
      gender: 'Male',
      roll: '1',
      guardianName: 'QA family',
      phone: '+971501234567',
      guardianUserId: parent.id,
      studentUserId: student.id,
    })
  ).body.data;
  const vehicle = async (n = 1, capacity = 3) => {
    const r = await request(app)
      .post('/api/v1/transport/vehicles')
      .set(admin.h)
      .send({ regNumber: 'QA-BUS-' + n, capacity, driverName: 'QA Driver', driverPhone: '+971501234567' });
    expect(r.status).toBe(201);
    return r.body.data;
  };
  const route = async (v: string, n = 1) => {
    const r = await request(app)
      .post('/api/v1/transport/routes')
      .set(admin.h)
      .send({ name: 'QA route ' + n, vehicleId: v, stops: [{ name: 'QA Stop', time: '07:30' }] });
    expect(r.status).toBe(201);
    return r.body.data;
  };
  return { admin, parent, student, child, vehicle, route };
}
it('serializes conflicting cross-route assignments and duplicate vehicle route creation', async () => {
  const { admin, child, vehicle, route } = await fixture();
  const v1 = await vehicle(1),
    v2 = await vehicle(2),
    r1 = await route(v1._id, 1),
    r2 = await route(v2._id, 2);
  const assigned = await Promise.all(
    [r1, r2].map((r) =>
      request(app)
        .post('/api/v1/transport/routes/' + r._id + '/assign')
        .set(admin.h)
        .send({ studentId: child._id, stopName: 'QA Stop' }),
    ),
  );
  expect(assigned.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(await Route.countDocuments({ assignedStudents: child._id })).toBe(1);
  const v3 = await vehicle(3);
  const routes = await Promise.all(
    [3, 4].map((n) =>
      request(app)
        .post('/api/v1/transport/routes')
        .set(admin.h)
        .send({ name: 'QA simultaneous ' + n, vehicleId: v3._id, stops: ['QA Stop'] }),
    ),
  );
  expect(routes.map((r) => r.status).sort()).toEqual([201, 409]);
});
it('family views contain only linked riders and assigned vehicles for both Student and Parent', async () => {
  const { admin, parent, student, child, vehicle, route } = await fixture();
  const v = await vehicle(),
    r = await route(v._id);
  const other = (
    await request(app).post('/api/v1/students').set(admin.h).send({
      refId: 'QA-TRANS-2',
      name: 'Other private child',
      grade: 'Grade 8',
      gender: 'Male',
      roll: '2',
      guardianName: 'QA other family',
      phone: '+971501234567',
    })
  ).body.data;
  for (const s of [child, other])
    expect(
      (
        await request(app)
          .post('/api/v1/transport/routes/' + r._id + '/assign')
          .set(admin.h)
          .send({ studentId: s._id })
      ).status,
    ).toBe(200);
  await vehicle(2);
  const currentBus = await Vehicle.findById(v._id);
  expect(
    (
      await request(app)
        .patch('/api/v1/transport/vehicles/' + v._id)
        .set(admin.h)
        .send({
          capacity: 1,
          expectedUpdatedAt: currentBus!.updatedAt.toISOString(),
          reason: 'QA capacity below assigned riders',
        })
    ).status,
  ).toBe(409);
  expect(
    (
      await request(app)
        .patch('/api/v1/transport/vehicles/' + v._id)
        .set(parent.h)
        .send({
          capacity: 2,
          expectedUpdatedAt: currentBus!.updatedAt.toISOString(),
          reason: 'Parent cannot edit vehicle',
        })
    ).status,
  ).toBe(403);
  expect(
    (
      await request(app)
        .post('/api/v1/transport/routes/' + r._id + '/assign')
        .set(student.h)
        .send({ studentId: child._id })
    ).status,
  ).toBe(403);

  for (const u of [parent, student]) {
    const list = await request(app).get('/api/v1/transport/routes').set(u.h);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].assignedStudents).toHaveLength(1);
    expect(list.body.data[0].assignedStudents[0].refId).toBe(child.refId);
    expect(list.body.data[0].history).toHaveLength(0);
    expect(list.body.data[0].studentStops).toHaveLength(1);
    expect(JSON.stringify(list.body.data)).not.toContain('Other private child');
    expect((await request(app).get('/api/v1/transport/vehicles').set(u.h)).body.data).toHaveLength(1);
  }
});
it('maintenance and road operation serialize, with guarded capacity and stale vehicle edits', async () => {
  const { admin, child, vehicle, route } = await fixture();
  const v = await vehicle(),
    r = await route(v._id);
  await request(app)
    .post('/api/v1/transport/routes/' + r._id + '/assign')
    .set(admin.h)
    .send({ studentId: child._id });
  const own = await Route.findById(r._id),
    bus = await Vehicle.findById(v._id);
  const operations = await Promise.all([
    request(app)
      .patch('/api/v1/transport/routes/' + r._id + '/operational-status')
      .set(admin.h)
      .send({ status: 'On road', expectedUpdatedAt: own!.updatedAt.toISOString(), reason: 'QA departure' }),
    request(app)
      .patch('/api/v1/transport/vehicles/' + v._id + '/maintenance')
      .set(admin.h)
      .send({ status: 'Maintenance', expectedUpdatedAt: bus!.updatedAt.toISOString(), reason: 'QA repair inspection' }),
  ]);
  expect(operations.every((r) => [200, 409].includes(r.status))).toBe(true);
  let latest = await Vehicle.findById(v._id);
  if (latest!.status !== 'Maintenance') {
    expect(
      (
        await request(app)
          .patch('/api/v1/transport/vehicles/' + v._id)
          .set(admin.h)
          .send({
            status: 'Maintenance',
            expectedUpdatedAt: latest!.updatedAt.toISOString(),
            reason: 'QA repair inspection',
          })
      ).status,
    ).toBe(200);
    latest = await Vehicle.findById(v._id);
  }
  expect((await Route.findById(r._id))!.status).toBe('Depot');
  expect(
    (
      await request(app)
        .patch('/api/v1/transport/vehicles/' + v._id)
        .set(admin.h)
        .send({ status: 'Available', expectedUpdatedAt: v.updatedAt, reason: 'Stale release' })
    ).status,
  ).toBe(409);
  const released = await request(app)
    .patch('/api/v1/transport/vehicles/' + v._id)
    .set(admin.h)
    .send({
      status: 'Available',
      insuranceExpiry: '2020-01-01',
      expectedUpdatedAt: latest!.updatedAt.toISOString(),
      reason: 'QA expiry scenario',
    });
  expect(released.status).toBe(200);
  const current = await Route.findById(r._id);
  expect(
    (
      await request(app)
        .patch('/api/v1/transport/routes/' + r._id + '/operational-status')
        .set(admin.h)
        .send({ status: 'On road', expectedUpdatedAt: current!.updatedAt.toISOString(), reason: 'QA expiry blocked' })
    ).status,
  ).toBe(409);
});
it('removes riders with a reason and protects archived vehicle reuse on restore', async () => {
  const { admin, child, vehicle, route } = await fixture();
  const v = await vehicle(),
    r = await route(v._id);
  const assigned = await request(app)
    .post('/api/v1/transport/routes/' + r._id + '/assign')
    .set(admin.h)
    .send({ studentId: child._id, stopName: 'QA Stop' });
  expect(
    (
      await request(app)
        .patch('/api/v1/transport/routes/' + r._id)
        .set(admin.h)
        .send({ archived: true, expectedUpdatedAt: assigned.body.data.updatedAt, reason: 'Riders still assigned' })
    ).status,
  ).toBe(409);
  const removed = await request(app)
    .post('/api/v1/transport/routes/' + r._id + '/remove')
    .set(admin.h)
    .send({ studentId: child._id, expectedUpdatedAt: assigned.body.data.updatedAt, reason: 'QA transport ended' });
  expect(removed.status).toBe(200);
  expect(removed.body.data.studentStops).toHaveLength(0);
  const archived = await request(app)
    .patch('/api/v1/transport/routes/' + r._id)
    .set(admin.h)
    .send({ archived: true, expectedUpdatedAt: removed.body.data.updatedAt, reason: 'QA route retired' });
  expect(archived.status).toBe(200);
  await route(v._id, 2);
  expect(
    (
      await request(app)
        .patch('/api/v1/transport/routes/' + r._id)
        .set(admin.h)
        .send({
          archived: false,
          expectedUpdatedAt: archived.body.data.updatedAt,
          reason: 'QA restore competing vehicle',
        })
    ).status,
  ).toBe(409);
  expect((await request(app).get('/api/v1/transport/routes?archived=true').set(admin.h)).body.data).toHaveLength(1);
});
it('records actual incident resolution with version history and rejects future reports', async () => {
  const { admin, vehicle, route } = await fixture();
  const r = await route((await vehicle())._id);
  expect(
    (
      await request(app)
        .post('/api/v1/transport/routes/' + r._id + '/incidents')
        .set(admin.h)
        .send({ type: 'Traffic delay', description: 'Future report', occurredAt: '2099-01-01T00:00:00Z' })
    ).status,
  ).toBe(400);
  const incident = (
    await request(app)
      .post('/api/v1/transport/routes/' + r._id + '/incidents')
      .set(admin.h)
      .send({ type: 'Mechanical issue', description: 'QA inspection required', severity: 'Moderate' })
  ).body.data;
  const resolved = await request(app)
    .patch('/api/v1/transport/incidents/' + incident._id)
    .set(admin.h)
    .send({
      status: 'Resolved',
      resolution: 'QA vehicle inspection completed',
      expectedUpdatedAt: incident.updatedAt,
      reason: 'QA operations review',
    });
  expect(resolved.status).toBe(200);
  expect(resolved.body.data.history).toHaveLength(1);
  expect(resolved.body.data.resolvedAt).toBeTruthy();
  expect(
    (
      await request(app)
        .patch('/api/v1/transport/incidents/' + incident._id)
        .set(admin.h)
        .send({
          status: 'Open',
          resolution: 'QA follow-up required',
          expectedUpdatedAt: incident.updatedAt,
          reason: 'Stale incident review',
        })
    ).status,
  ).toBe(409);
});
