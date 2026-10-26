import request from 'supertest';
import { User } from '../src/models/User';
import { createApp } from '../src/app';

const app = createApp();

describe('Auth API', () => {
  const validUser = {
    name: 'Rashid Al Maktoum',
    email: 'rashid@alnoor.ae',
    password: 'StrongPass123',
    role: 'Administrator',
  };

  it('registers a new user and returns tokens', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.passwordHash).toBeUndefined(); // never leak the hash
  });

  it('rejects registration with a weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, email: 'weak@alnoor.ae', password: 'weak' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate email registration', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app).post('/api/v1/auth/register').send(validUser);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('logs in with correct credentials', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ role: 'Administrator', email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('rejects login with wrong password using a generic error (no user enumeration)', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ role: 'Administrator', email: validUser.email, password: 'WrongPass123' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('rejects login for a non-existent email with the SAME generic error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ role: 'Administrator', email: 'nobody@alnoor.ae', password: 'WhoKnows123' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('refreshes an access token with a valid refresh token', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: reg.body.data.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('rejects /me without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the full authenticated user on /me with a valid token', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${reg.body.data.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('Administrator');
    expect(res.body.data.user.name).toBe(validUser.name);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects /me for a still-valid token whose account has since been deactivated', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(validUser);
    const { User } = await import('../src/models/User');
    await User.findByIdAndUpdate(reg.body.data.user._id ?? reg.body.data.user.id, { isActive: false });
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${reg.body.data.accessToken}`);
    expect(res.status).toBe(401);
  });

  it('revokes refresh tokens on logout (an old refresh token no longer works)', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(validUser);
    const { accessToken, refreshToken } = reg.body.data;
    const logoutRes = await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${accessToken}`);
    expect(logoutRes.status).toBe(200);

    const refreshRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });
  it('rejects an access token immediately after logout', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(validUser);
    const token = reg.body.data.accessToken;
    expect((await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/students').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  });
  it('rejects access after deactivation or a role change without waiting for token expiry', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(validUser);
    const token = reg.body.data.accessToken,
      id = reg.body.data.user._id;
    await User.updateOne({ _id: id }, { $set: { isActive: false } });
    expect((await request(app).get('/api/v1/students').set('Authorization', `Bearer ${token}`)).status).toBe(401);
    await User.updateOne({ _id: id }, { $set: { isActive: true, role: 'Student' } });
    expect((await request(app).get('/api/v1/staff').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  });
});
