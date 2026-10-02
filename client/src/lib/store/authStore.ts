import { create } from 'zustand';

export type Role = 'Administrator' | 'Principal' | 'Teacher' | 'Accountant' | 'Parent' | 'Student';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  clearSession: () => void;
}

const STORAGE_KEY = 'schoolos.session.v1';

function loadPersisted(): Pick<AuthState, 'user' | 'accessToken' | 'refreshToken'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, accessToken: null, refreshToken: null };
    return JSON.parse(raw);
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

/** Access/refresh tokens persisted in localStorage for this reference implementation.
 * For a stricter production posture, move the refresh token to an httpOnly cookie set by the
 * server (eliminates XSS-based token theft) - noted explicitly in SECURITY-COMPLIANCE.md as a
 * Stage 2 hardening item rather than silently shipped as if already done. */
export const useAuthStore = create<AuthState>((set) => ({
  ...loadPersisted(),
  setSession: (user, accessToken, refreshToken) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, accessToken, refreshToken }));
    set({ user, accessToken, refreshToken });
  },
  setAccessToken: (accessToken) => {
    set((state) => {
      const next = { ...state, accessToken };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: next.user, accessToken, refreshToken: next.refreshToken }),
      );
      return { accessToken };
    });
  },
  clearSession: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));

export function canWrite(role: Role | undefined): boolean {
  return role === 'Administrator' || role === 'Principal' || role === 'Teacher';
}
