'use client';

import { useState, useMemo } from 'react';
import { DataTable, TableToolbar } from '@/components/DataTable';
import { getReviewColumns } from '@/components/columns';
import type { ReviewWithLaunch } from '@/lib/types';

export default function ReviewsClient({
  pendingReviews,
}: {
  pendingReviews: ReviewWithLaunch[];
}) {
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    return [...pendingReviews].sort((a, b) => {
      const da = new Date(a.slo_started_at || '0').getTime();
      const db = new Date(b.slo_started_at || '0').getTime();
      return sortAsc ? da - db : db - da;
    });
  }, [pendingReviews, sortAsc]);

  return (
    <div className="app-content">
      <TableToolbar
        sortLabel="Date Requested"
        sortAsc={sortAsc}
        onToggleSort={() => setSortAsc(prev => !prev)}
      />

      <DataTable
        data={sorted}
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

      <div className="table-footer">
        Showing {sorted.length} of {pendingReviews.length}
      </div>
    </div>
  );
}
