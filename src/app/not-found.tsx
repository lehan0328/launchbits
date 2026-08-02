import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="app-content">
      <div className="empty-state detail-empty-state">
        <div className="empty-state-title">Page not found</div>
        <p className="text-secondary text-sm mt-2">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/" className="btn btn-secondary mb-6">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
