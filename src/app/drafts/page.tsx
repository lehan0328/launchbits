import { getCurrentUser } from '@/lib/db';
import { redirect } from 'next/navigation';

export default async function DraftsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="app-content">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 8 }}>Drafts</h1>
      <p style={{ color: 'var(--ar-text-secondary)' }}>Draft launches will appear here.</p>
    </div>
  );
}
