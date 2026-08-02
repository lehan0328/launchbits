import { getCurrentUser } from '@/server/db';
import { redirect } from 'next/navigation';

export default async function SubscribedPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="app-content">
      <h1 className="page-title">Subscribed</h1>
      <p className="text-secondary">Launches you&apos;re subscribed to will appear here.</p>
    </div>
  );
}
