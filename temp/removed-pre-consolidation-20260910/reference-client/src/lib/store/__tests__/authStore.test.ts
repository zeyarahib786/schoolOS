import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, canWrite } from '../authStore';

const sampleUser = { id: 'u1', name: 'Rashid Al Maktoum', email: 'admin@alnoor.ae', role: 'Administrator' as const };

describe('canWrite', () => {
  it('grants write access to Administrator, Principal, and Teacher', () => {
    expect(canWrite('Administrator')).toBe(true);
    expect(canWrite('Principal')).toBe(true);
    expect(canWrite('Teacher')).toBe(true);
  });

  it('denies write access to Accountant, Parent, and Student', () => {
    expect(canWrite('Accountant')).toBe(false);
    expect(canWrite('Parent')).toBe(false);
    expect(canWrite('Student')).toBe(false);
  });

  it('denies write access when role is undefined (not yet authenticated)', () => {
    expect(canWrite(undefined)).toBe(false);
  });
});

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearSession();
  });

  it('starts with no session when localStorage is empty', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('setSession stores the session and persists it to localStorage', () => {
    useAuthStore.getState().setSession(sampleUser, 'access-1', 'refresh-1');
    const state = useAuthStore.getState();
    expect(state.user).toEqual(sampleUser);
    expect(state.accessToken).toBe('access-1');

    const persisted = JSON.parse(localStorage.getItem('schoolos.session.v1')!);
    expect(persisted.user).toEqual(sampleUser);
    expect(persisted.refreshToken).toBe('refresh-1');
  });

  it('setAccessToken updates only the access token, leaving user and refresh token intact', () => {
    useAuthStore.getState().setSession(sampleUser, 'access-1', 'refresh-1');
    useAuthStore.getState().setAccessToken('access-2');
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('access-2');
    expect(state.user).toEqual(sampleUser);
    expect(state.refreshToken).toBe('refresh-1');

    const persisted = JSON.parse(localStorage.getItem('schoolos.session.v1')!);
    expect(persisted.accessToken).toBe('access-2');
  });

  it('clearSession removes the session from both memory and localStorage', () => {
    useAuthStore.getState().setSession(sampleUser, 'access-1', 'refresh-1');
    useAuthStore.getState().clearSession();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(localStorage.getItem('schoolos.session.v1')).toBeNull();
  });

  it('never persists or exposes a password anywhere in the session shape', () => {
    useAuthStore.getState().setSession(sampleUser, 'access-1', 'refresh-1');
    const persisted = localStorage.getItem('schoolos.session.v1')!;
    expect(persisted).not.toContain('password');
  });
});
