import { getCurrentUser, getLaunchById, getReviewsForLaunch, getEventsForLaunch, isSubscribed } from '@/server/db';
import { redirect } from 'next/navigation';
import LaunchDetailClient from './LaunchDetailClient';

export default async function LaunchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const launch = await getLaunchById(id);

  const [reviews, events, subscribed] = launch
    ? await Promise.all([
        getReviewsForLaunch(launch.id),
        getEventsForLaunch(launch.id),
        isSubscribed(launch.id, user.id),
      ])
    : [[], [], false];

  return <LaunchDetailClient launch={launch} reviews={reviews} events={events} user={user} initialSubscribed={subscribed} />;
}
