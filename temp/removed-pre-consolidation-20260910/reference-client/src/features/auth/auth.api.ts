import { apiClient, ApiSuccess } from '../../lib/api/client';
import { AuthUser } from '../../lib/store/authStore';

interface AuthPayload {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export async function login(email: string, password: string): Promise<AuthPayload> {
  const res = await apiClient.post<ApiSuccess<AuthPayload>>('/auth/login', { email, password });
  return res.data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

/** Revalidates the session against the server rather than trusting cached localStorage data
 * indefinitely - if the access token is expired the apiClient's interceptor transparently
 * refreshes it first; if the account has since been deactivated, this throws (401) and the
 * caller should clear the local session, since a stale client cache is not a source of truth. */
export async function getCurrentUser(): Promise<AuthUser> {
  const res = await apiClient.get<ApiSuccess<{ user: AuthUser }>>('/auth/me');
  return res.data.data.user;
}
