import { Request, Response, NextFunction } from 'express';
jest.mock('../../src/modules/auth/auth.service', () => ({
  validateAccessSession: jest.fn().mockResolvedValue(undefined),
  verifyAccessToken: (token: string) => {
    if (token === 'admin') return { sub: 'admin-id', role: 'Administrator' };
    if (token === 'parent') return { sub: 'parent-id', role: 'Parent' };
    throw new Error('Invalid token');
  },
}));
jest.mock('../../src/modules/guardians/guardians.access', () => ({
  assertGuardianPortalAccess: jest.fn().mockResolvedValue(undefined),
}));
import { registrationAccess } from '../../src/modules/auth/registration-access';
async function attempt(token?: string, fixtureMode = false) {
  const req = { header: () => (token ? `Bearer ${token}` : undefined) } as unknown as Request;
  const next = jest.fn() as jest.Mock & NextFunction;
  registrationAccess(fixtureMode)(req, {} as Response, next);
  await Promise.resolve();
  await Promise.resolve();
  return next;
}
describe('registration access outside fixture mode', () => {
  it('rejects anonymous creation even if the requested account role is Administrator', async () => {
    expect((await attempt()).mock.calls[0][0]).toMatchObject({ statusCode: 401 });
  });
  it('rejects a Parent token and accepts only an authenticated Administrator', async () => {
    expect((await attempt('parent')).mock.calls[0][0]).toMatchObject({ statusCode: 403 });
    expect((await attempt('invalid')).mock.calls[0][0]).toMatchObject({ statusCode: 401 });
    expect((await attempt('admin')).mock.calls[0]).toEqual([]);
  });
  it('permits explicit server-side fixture mode for isolated integration tests', async () => {
    expect((await attempt(undefined, true)).mock.calls[0]).toEqual([]);
  });
});
