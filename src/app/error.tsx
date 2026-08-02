'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('[PageError]', error.message, error.digest, error.stack);

  return (
    <div className="app-content" style={{ padding: 40 }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>
        Something went wrong
      </h2>
      <p style={{ color: 'var(--ar-text-secondary)', marginBottom: 4 }}>
        {error.message || 'An unexpected error occurred.'}
      </p>
      {error.digest && (
        <p style={{ color: '#999', fontSize: 12, marginBottom: 16 }}>
          Digest: {error.digest}
        </p>
      )}
      <button
        onClick={() => reset()}
        style={{
          padding: '8px 16px',
          background: 'var(--ar-primary)',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
