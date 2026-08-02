'use client';

import { DataTable } from '@/components/DataTable';
import { getReviewColumns } from '@/components/columns';
import type { ReviewWithLaunch } from '@/lib/types';

export default function ReviewsClient({
  pendingReviews,
}: {
  pendingReviews: ReviewWithLaunch[];
}) {
  return (
    <div className="app-content">
      <DataTable
        data={pendingReviews}
        columns={getReviewColumns()}
        expandable={false}
        emptyState={
          <div className="empty-state">
            <div className="empty-state-title">All caught up</div>
            <p className="text-secondary text-sm mt-2">
              No reviews need your attention right now.
            </p>
          </div>
        }
      />
    </div>
  );
}
