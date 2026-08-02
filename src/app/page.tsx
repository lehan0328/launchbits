import { getCurrentUser, getLaunches, getPendingReviewsForUser } from '@/server/db';
import { redirect } from 'next/navigation';
import type { Launch } from '@/lib/types';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const launches = await getLaunches(user.org_id);
  const pendingReviews = await getPendingReviewsForUser(user.org_id, user.id);

  // Deduplicate by launch — multiple reviews can point to the same launch
  const seen = new Set<string>();
  const pendingApproval: Launch[] = [];
  for (const review of pendingReviews) {
    if (review.launch && !seen.has(review.launch_id)) {
      seen.add(review.launch_id);
      pendingApproval.push(review.launch);
    }
  }

  return (
    <DashboardClient launches={launches} pendingApproval={pendingApproval} />
  );
}
