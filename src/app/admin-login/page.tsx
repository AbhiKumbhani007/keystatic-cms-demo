'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/keystatic';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.replace(from);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? 'Login failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--ds-bg)',
        color: 'var(--ds-fg)',
        padding: '1.5rem',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          background: 'var(--ds-surface)',
          border: '1px solid var(--ds-border)',
          borderRadius: 12,
          padding: '1.75rem',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Admin sign in</h1>
        <p style={{ margin: 0, color: 'var(--ds-muted)', fontSize: '0.85rem' }}>
          Sign in to access the content admin.
        </p>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.8rem' }}>Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: '0.55rem 0.7rem',
              borderRadius: 8,
              border: '1px solid var(--ds-border)',
              background: 'var(--ds-bg)',
              color: 'var(--ds-fg)',
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.8rem' }}>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: '0.55rem 0.7rem',
              borderRadius: 8,
              border: '1px solid var(--ds-border)',
              background: 'var(--ds-bg)',
              color: 'var(--ds-fg)',
            }}
          />
        </label>

        {error && (
          <p style={{ margin: 0, color: '#e5484d', fontSize: '0.8rem' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 4,
            padding: '0.6rem 0.7rem',
            borderRadius: 8,
            border: 'none',
            background: loading ? 'var(--ds-muted)' : 'var(--ds-accent)',
            color: '#fff',
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
