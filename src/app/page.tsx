import { getCurrentUser, getLaunches, getPendingReviewsForUser } from '@/server/db';
import { redirect } from 'next/navigation';
import type { Launch } from '@/lib/types';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const allLaunches = await getLaunches(user.org_id);
  const pendingReviews = await getPendingReviewsForUser(user.org_id, user.id);

  // Filter out drafts — they belong in /drafts, not the dashboard
  const launches = allLaunches.filter(l => l.status !== 'DRAFT');

  // Deduplicate by launch — multiple reviews can point to the same launch
  const seen = new Set<string>();
  const pendingApproval: Launch[] = [];
  for (const review of pendingReviews) {
    if (review.launch && !seen.has(review.launch_id)) {
      seen.add(review.launch_id);
      pendingApproval.push(review.launch);
    }
  }

  // Summary stats for dashboard cards
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activeLaunches = launches.filter(
    l => l.status === 'IN_REVIEW' || l.status === 'APPROVED' || l.status === 'LAUNCHED_WITH_EXCEPTION'
  ).length;

  const recentlyApproved = launches.filter(
    l => l.status === 'APPROVED' && new Date(l.updated_at) >= sevenDaysAgo
  ).length;

  return (
    <DashboardClient
      launches={launches}
      pendingApproval={pendingApproval}
      stats={{
        activeLaunches,
        pendingReviews: pendingApproval.length,
        recentlyApproved,
      }}
    />
  );
}
