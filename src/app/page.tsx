import {
  DataTable,
  SectionHeader,
} from '@/components/DataTable';
import { getCurrentUser, getLaunches, getPendingReviewsForUser } from '@/lib/db';
import { getOwnedColumns, getPendingColumns } from '@/lib/columns';
import { redirect } from 'next/navigation';
import type { Launch } from '@/lib/types';

export default async function DashboardPage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (e) {
    console.error('[DashboardPage] getCurrentUser threw:', e);
    redirect('/login');
  }
  if (!user) redirect('/login');

  let launches: Launch[] = [];
  let pendingApproval: Launch[] = [];

  try {
    launches = await getLaunches(user.org_id);
    const pendingReviews = await getPendingReviewsForUser(user.org_id, user.id);

    // Deduplicate by launch — multiple reviews can point to the same launch
    const seen = new Set<string>();
    for (const review of pendingReviews) {
      if (review.launch && !seen.has(review.launch_id)) {
        seen.add(review.launch_id);
        pendingApproval.push(review.launch);
      }
    }
  } catch (e) {
    console.error('[DashboardPage] Data fetch error:', e);
  }

  return (
    <div className="app-content">
      {/* Section: Owned by you */}
      <SectionHeader title="Owned by you" count={launches.length} />

      <DataTable
        data={launches}
        columns={getOwnedColumns()}
      />

      {/* Section: Pending your approval */}
      <SectionHeader
        title="Pending your approval"
        count={pendingApproval.length}
        style={{ marginTop: 32 }}
      />

      <DataTable
        data={pendingApproval}
        columns={getPendingColumns()}
        expandable={false}
        emptyState={
          <div className="empty-state">
            <div className="empty-state-icon">🚀</div>
          </div>
        }
      />
    </div>
  );
}

