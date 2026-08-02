import { getCurrentUser, getReviewDefinitions } from '@/server/db';
import { redirect } from 'next/navigation';
import NewLaunchClient from './NewLaunchClient';

export default async function NewLaunchPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const reviewDefinitions = await getReviewDefinitions(user.org_id);

  return <NewLaunchClient reviewDefinitions={reviewDefinitions} />;
}
