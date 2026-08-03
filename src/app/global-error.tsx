'use client';

// ============================================================================
// GLOBAL ERROR HANDLER — Captures unhandled errors and reports to Sentry
// ============================================================================

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  // Also log for local debugging
  console.error('[GlobalError]', error.message, error.digest, error.stack);

  return (
    <html lang="en">
      <body style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: "'Google Sans', 'Inter', system-ui, sans-serif",
        color: '#3c4043',
        background: '#f8f9fa',
        padding: 40,
      }}>
        <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Something went wrong</h2>
        <p style={{ color: '#5f6368', marginBottom: '24px' }}>
          An unexpected error occurred. Our team has been notified.
        </p>
        {error.digest && (
          <p style={{ color: '#999', fontSize: 12, marginBottom: 16 }}>Digest: {error.digest}</p>
        )}
        <button
          onClick={() => reset()}
          style={{
            padding: '10px 24px',
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
