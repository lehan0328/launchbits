import { getCurrentUser, getLaunches } from '@/lib/db';
import { redirect } from 'next/navigation';
import OwnedClient from './OwnedClient';

export default async function OwnedPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const launches = await getLaunches(user.org_id);

  return <OwnedClient launches={launches} />;
}
