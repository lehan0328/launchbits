import { getCurrentUser, getDraftLaunches } from '@/server/db';
import { redirect } from 'next/navigation';
import DraftsClient from './DraftsClient';

export default async function DraftsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const drafts = await getDraftLaunches(user.org_id, user.id);

  return <DraftsClient drafts={drafts} />;
}
