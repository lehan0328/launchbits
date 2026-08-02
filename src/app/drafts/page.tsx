import { getCurrentUser } from '@/server/db';
import { redirect } from 'next/navigation';

export default async function DraftsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="app-content">
      <h1 className="page-title">Drafts</h1>
      <p className="text-secondary">Draft launches will appear here.</p>
    </div>
  );
}
