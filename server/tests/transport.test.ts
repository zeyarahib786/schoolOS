import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
}

async function createStudent(token: string, refId: string, guardianUserId?: string) {
  if (guardianUserId)
    token = (await registerAndLogin('Administrator', 'transport-link-' + refId.toLowerCase() + '@example.invalid'))
      .token;
  const res = await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send({
    refId,
    name: 'Fatima Al Hashimi',
    grade: 'Grade 10 · A',
    gender: 'Female',
    roll: '12',
    guardianName: 'Khalid',
    guardianUserId,
    phone: '+971501234567',
  });
  return res.body.data._id as string;
}

async function createVehicle(token: string, regNumber: string, capacity: number) {
  const res = await request(app)
    .post('/api/v1/transport/vehicles')
    .set('Authorization', `Bearer ${token}`)
    .send({ regNumber, capacity, driverName: 'Ahmed Khan', driverPhone: '+971501112233' });
  return res.body.data._id as string;
}

async function createRoute(token: string, name: string, vehicleId: string) {
  const res = await request(app)
    .post('/api/v1/transport/routes')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, vehicleId, stops: ['Al Barsha', 'Downtown'] });
  return res.body.data._id as string;
}

describe('Transport API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/transport/routes');
    expect(res.status).toBe(401);
  });

  it('rejects vehicle creation by a Parent', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/transport/vehicles')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ regNumber: 'DXB-1', capacity: 40, driverName: 'X', driverPhone: '+971501112233' });
    expect(res.status).toBe(403);
  });

  it('assigns a student to a route with available capacity', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const vehicleId = await createVehicle(teacher.token, 'DXB-2', 2);
    const routeId = await createRoute(teacher.token, 'Route A', vehicleId);
    const studentId = await createStudent(teacher.token, 'ANS-4001');
    const res = await request(app)
      .post(`/api/v1/transport/routes/${routeId}/assign`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId });
    expect(res.status).toBe(200);
    expect(res.body.data.assignedStudents.length).toBe(1);
  });

  it('rejects assignment once the route is at full capacity', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const vehicleId = await createVehicle(teacher.token, 'DXB-3', 1);
    const routeId = await createRoute(teacher.token, 'Route B', vehicleId);
    const s1 = await createStudent(teacher.token, 'ANS-4002');
    const s2 = await createStudent(teacher.token, 'ANS-4003');
    const first = await request(app)
      .post(`/api/v1/transport/routes/${routeId}/assign`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId: s1 });
    expect(first.status).toBe(200);
    const second = await request(app)
      .post(`/api/v1/transport/routes/${routeId}/assign`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId: s2 });
    expect(second.status).toBe(409);
  });

  it('CONCURRENCY: two simultaneous requests for the LAST seat - exactly one succeeds, never both, proving the atomic array-size guard actually works', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const vehicleId = await createVehicle(teacher.token, 'DXB-4', 1);
    const routeId = await createRoute(teacher.token, 'Route C', vehicleId);
    const s1 = await createStudent(teacher.token, 'ANS-4004');
    const s2 = await createStudent(teacher.token, 'ANS-4005');

    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/v1/transport/routes/${routeId}/assign`)
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({ studentId: s1 }),
      request(app)
        .post(`/api/v1/transport/routes/${routeId}/assign`)
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({ studentId: s2 }),
    ]);
    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);
  });

  it('assigning the SAME student twice is a no-op, not a duplicate entry or an error', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    const vehicleId = await createVehicle(teacher.token, 'DXB-5', 5);
    const routeId = await createRoute(teacher.token, 'Route D', vehicleId);
    const studentId = await createStudent(teacher.token, 'ANS-4006');
    await request(app)
      .post(`/api/v1/transport/routes/${routeId}/assign`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId });
    const res = await request(app)
      .post(`/api/v1/transport/routes/${routeId}/assign`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId });
    expect(res.status).toBe(200);
    expect(res.body.data.assignedStudents.length).toBe(1); // still 1, not 2
  });

  it('a Parent sees only routes their linked child is assigned to', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher5@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent2@alnoor.ae');
    const vehicleId = await createVehicle(teacher.token, 'DXB-6', 5);
    const secondVehicleId = await createVehicle(teacher.token, 'DXB-66', 5);
    const myChildRoute = await createRoute(teacher.token, 'Route E', vehicleId);
    const otherChildRoute = await createRoute(teacher.token, 'Route F', secondVehicleId);
    const myChildId = await createStudent(teacher.token, 'ANS-4007', parent.userId);
    const otherChildId = await createStudent(teacher.token, 'ANS-4008');
    await request(app)
      .post(`/api/v1/transport/routes/${myChildRoute}/assign`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId: myChildId });
    await request(app)
      .post(`/api/v1/transport/routes/${otherChildRoute}/assign`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId: otherChildId });

    const res = await request(app).get('/api/v1/transport/routes').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('does not assign a student to two routes, preventing conflicting pickup lists', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-single-route@alnoor.ae');
    const vehicle1 = await createVehicle(teacher.token, 'DXB-7', 5);
    const vehicle2 = await createVehicle(teacher.token, 'DXB-8', 5);
    const route1 = await createRoute(teacher.token, 'Route G', vehicle1);
    const route2 = await createRoute(teacher.token, 'Route H', vehicle2);
    const studentId = await createStudent(teacher.token, 'ANS-4009');
    await request(app)
      .post(`/api/v1/transport/routes/${route1}/assign`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId });
    const duplicate = await request(app)
      .post(`/api/v1/transport/routes/${route2}/assign`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ studentId });
    expect(duplicate.status).toBe(409);
  });

  it('persists delay, incident, and maintenance actions used by the existing transport UI', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-operations@alnoor.ae');
    const vehicleId = await createVehicle(teacher.token, 'DXB-9', 5);
    const routeId = await createRoute(teacher.token, 'Route I', vehicleId);
    const delayed = await request(app)
      .patch(`/api/v1/transport/routes/${routeId}/operational-status`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        status: 'Delayed',
        expectedUpdatedAt: (
          await request(app).get('/api/v1/transport/routes').set('Authorization', `Bearer ${teacher.token}`)
        ).body.data[0].updatedAt,
        reason: 'QA traffic delay',
      });
    expect(delayed.status).toBe(200);
    expect(delayed.body.data.status).toBe('Delayed');
    const incident = await request(app)
      .post(`/api/v1/transport/routes/${routeId}/incidents`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        type: 'Traffic delay',
        severity: 'Moderate',
        location: 'Sheikh Zayed Road',
        description: 'Traffic congestion affected pickup time',
      });
    expect(incident.status).toBe(201);
    const listed = await request(app)
      .get('/api/v1/transport/incidents')
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);
    const maintenance = await request(app)
      .patch(`/api/v1/transport/vehicles/${vehicleId}/maintenance`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        status: 'Maintenance',
        expectedUpdatedAt: (
          await request(app).get('/api/v1/transport/vehicles').set('Authorization', `Bearer ${teacher.token}`)
        ).body.data[0].updatedAt,
        reason: 'QA maintenance review',
      });
    expect(maintenance.status).toBe(200);
    const routeList = await request(app)
      .get('/api/v1/transport/routes')
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(routeList.body.data[0].status).toBe('Depot');
    const restart = await request(app)
      .patch(`/api/v1/transport/routes/${routeId}/operational-status`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ status: 'On road', expectedUpdatedAt: routeList.body.data[0].updatedAt, reason: 'QA restart attempted' });
    expect(restart.status).toBe(409);
  });
});
