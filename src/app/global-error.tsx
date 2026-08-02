'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log the full error for debugging
  console.error('[GlobalError]', error.message, error.digest, error.stack);

  return (
    <html>
      <body style={{ padding: 40, fontFamily: 'system-ui' }}>
        <h2>Something went wrong</h2>
        <p style={{ color: '#666' }}>
          {error.message || 'An unexpected error occurred.'}
        </p>
        {error.digest && (
          <p style={{ color: '#999', fontSize: 12 }}>Digest: {error.digest}</p>
        )}
        <button
          onClick={() => reset()}
          style={{
            marginTop: 16,
            padding: '8px 16px',
            background: '#1a73e8',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
