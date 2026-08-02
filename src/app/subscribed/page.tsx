import { getCurrentUser } from '@/server/db';
import { redirect } from 'next/navigation';

export default async function SubscribedPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="app-content">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 8 }}>Subscribed</h1>
      <p style={{ color: 'var(--ar-text-secondary)' }}>Launches you&apos;re subscribed to will appear here.</p>
    </div>
  );
}
