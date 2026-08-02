import { getCurrentUser, getLaunchById, getReviewDefinitions } from '@/server/db';
import { redirect } from 'next/navigation';
import EditLaunchClient from './EditLaunchClient';

export default async function EditLaunchPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const [launch, reviewDefinitions] = await Promise.all([
    getLaunchById(id),
    getReviewDefinitions(user.org_id),
  ]);

  return <EditLaunchClient launch={launch} reviewDefinitions={reviewDefinitions} />;
}
