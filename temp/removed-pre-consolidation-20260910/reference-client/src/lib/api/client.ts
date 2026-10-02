import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export const apiClient = axios.create({ baseURL, timeout: 15000 });

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshInFlight: Promise<string> | null = null;

/** On a 401, attempt exactly one silent refresh-and-retry per request (never an infinite loop),
 * sharing a single in-flight refresh across concurrent requests so a page that fires 5 API calls
 * at once doesn't trigger 5 separate refresh attempts. */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const { refreshToken, clearSession, setAccessToken, user } = useAuthStore.getState();
      if (!refreshToken) {
        clearSession();
        return Promise.reject(error);
      }
      try {
        if (!refreshInFlight) {
          refreshInFlight = axios
            .post(`${baseURL}/auth/refresh`, { refreshToken })
            .then((res) => res.data.data.accessToken as string)
            .finally(() => {
              refreshInFlight = null;
            });
        }
        const newAccessToken = await refreshInFlight;
        setAccessToken(newAccessToken);
        if (user) original.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(original);
      } catch (refreshError) {
        clearSession();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: { pagination?: { page: number; limit: number; total: number; totalPages: number } } | null;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details?: unknown; requestId?: string };
}
