import request from 'supertest';
import { createApp } from '../src/app';
import mongoose from 'mongoose';
const app = createApp();
describe('Operational probes', () => {
  it('does not allow protected API responses to be cached', async () => {
    const response = await request(app).get('/api/v1/students');
    expect(response.status).toBe(401);
    expect(response.headers['cache-control']).toBe('private, no-store');
  });
  it('separates process liveness from transaction-capable database readiness', async () => {
    const ready = await request(app).get('/ready');
    expect(ready.status).toBe(200);
    expect(ready.body).toEqual({ status: 'ready', db: true });
    expect(ready.headers['x-request-id']).toBeDefined();
    await mongoose.disconnect();
    expect((await request(app).get('/health')).status).toBe(200);
    const unavailable = await request(app).get('/ready');
    expect(unavailable.status).toBe(503);
    expect(unavailable.body).toEqual({ status: 'not-ready', db: false });
    await mongoose.connect(process.env.MONGO_URI!);
  });
});
