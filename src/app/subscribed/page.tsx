import { getCurrentUser, getSubscribedLaunches } from '@/server/db';
import { redirect } from 'next/navigation';
import SubscribedClient from './SubscribedClient';

export default async function SubscribedPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const launches = await getSubscribedLaunches(user.org_id, user.id);

  return <SubscribedClient launches={launches} />;
}
