import { DataTable } from '@/components/DataTable';
import { getCurrentUser, getPendingReviewsForUser } from '@/lib/db';
import { getReviewColumns } from '@/lib/columns';
import { redirect } from 'next/navigation';

export default async function ReviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const pendingReviews = await getPendingReviewsForUser(user.org_id, user.id);

  return (
    <div className="app-content">
      <DataTable
        data={pendingReviews}
        columns={getReviewColumns()}
        expandable={false}
        emptyState={
          <div className="empty-state">
            <div className="empty-state-title">All caught up</div>
            <p className="text-secondary text-sm" style={{ marginTop: 8 }}>
              No reviews need your attention right now.
            </p>
          </div>
        }
      />
    </div>
  );
}
