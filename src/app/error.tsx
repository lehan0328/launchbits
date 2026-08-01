'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="app-content">
      <div className="empty-state" style={{ paddingTop: 120 }}>
        <div className="empty-state-title">Something went wrong</div>
        <p className="text-secondary text-sm" style={{ marginTop: 8 }}>
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          className="btn btn-primary"
          style={{ marginTop: 24 }}
          onClick={reset}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
