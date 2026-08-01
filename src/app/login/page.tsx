'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ============================================================================
// Login Page — Supabase Auth with Magic Link + Google OAuth
// Standalone page (not wrapped in the app-layout shell)
// ============================================================================

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Check your email for a login link!');
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="var(--color-primary)" />
            <path d="M8 22L14 10L20 18L26 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="login-logo-text">Launchbits</span>
        </div>

        <h1 className="login-title">Sign in to your account</h1>
        <p className="login-subtitle">Launch governance for modern teams</p>

        {/* Google OAuth */}
        <button
          type="button"
          className="login-google-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
            <path fill="#34A853" d="M9.003 18c2.43 0 4.467-.806 5.956-2.184l-2.909-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9.002 18z" />
            <path fill="#FBBC05" d="M3.966 10.707A5.41 5.41 0 0 1 3.684 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.009-2.332z" />
            <path fill="#EA4335" d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0A8.997 8.997 0 0 0 .957 4.961L3.966 7.293C4.674 5.166 6.659 3.58 9.003 3.58z" />
          </svg>
          Continue with Google
        </button>

        <div className="login-divider">
          <span>or</span>
        </div>

        {/* Magic Link */}
        <form onSubmit={handleMagicLink}>
          <label className="login-label" htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            className="login-input"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading || !email}
          >
            {loading ? 'Sending...' : 'Send magic link'}
          </button>
        </form>

        {message && <div className="login-message login-message--success">{message}</div>}
        {error && <div className="login-message login-message--error">{error}</div>}
      </div>
    </div>
  );
}
