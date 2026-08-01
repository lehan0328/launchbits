import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="app-content">
      <div className="empty-state" style={{ paddingTop: 120 }}>
        <div className="empty-state-title">Page not found</div>
        <p className="text-secondary text-sm" style={{ marginTop: 8 }}>
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/" className="btn btn-secondary" style={{ marginTop: 24 }}>
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
