import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from './auth.api';
import { useAuthStore } from '../../lib/store/authStore';

export function LoginPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { user, accessToken, refreshToken } = await authApi.login(email, password);
      setSession(user, accessToken, refreshToken);
      navigate('/students');
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'Unable to sign in - please try again';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          padding: 32,
          borderRadius: 16,
          width: 360,
          boxShadow: '0 1px 3px rgba(0,0,0,.08)',
        }}
        aria-label="Sign in to Solvagence SchoolOS"
      >
        <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Solvagence SchoolOS</h1>
        <p style={{ fontSize: 12.5, color: '#64748B', marginBottom: 20 }}>Sign in to continue</p>

        <label htmlFor="email" style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            height: 40,
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            padding: '0 12px',
            marginBottom: 14,
          }}
        />

        <label htmlFor="password" style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            height: 40,
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            padding: '0 12px',
            marginBottom: 18,
          }}
        />

        {error && (
          <div
            role="alert"
            style={{
              background: '#FDECEC',
              color: '#B42318',
              fontSize: 12.5,
              padding: '8px 12px',
              borderRadius: 8,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            height: 42,
            borderRadius: 10,
            background: '#0E7C39',
            color: '#fff',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
