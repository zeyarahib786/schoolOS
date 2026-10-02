import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../lib/store/authStore';
import * as authApi from '../features/auth/auth.api';

/** Guards every authenticated route client-side (UX convenience - redirect before a flash of
 * protected content). The REAL boundary is server-side requireAuth/requireRole on every API
 * route; this component only controls what renders, never what data can be fetched.
 *
 * Revalidates against /me on mount rather than trusting the cached localStorage user
 * indefinitely - closes a real gap where a deactivated account or a role change made by an
 * admin would otherwise go unnoticed by an already-logged-in browser tab until the access
 * token happened to expire. */
export function ProtectedRoute(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [checked, setChecked] = useState(false);
  const [valid, setValid] = useState(Boolean(user));

  useEffect(() => {
    if (!user) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    authApi
      .getCurrentUser()
      .then((freshUser) => {
        if (cancelled) return;
        if (accessToken && refreshToken) setSession(freshUser, accessToken, refreshToken);
        setValid(true);
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
        setValid(false);
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checked) {
    return (
      <div role="status" aria-live="polite" style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
        Checking your session…
      </div>
    );
  }
  if (!valid) return <Navigate to="/login" replace />;
  return <Outlet />;
}
