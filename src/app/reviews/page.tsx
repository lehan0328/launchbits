'use client';

import { useState } from 'react';
import { DataTable, TableToolbar } from '@/components/DataTable';
import { store } from '@/lib/store';
import { getReviewColumns } from '@/lib/columns';

export default function ReviewsPage() {
  const currentUser = store.getCurrentUser();
  const pendingReviews = store.getPendingReviewsForUser(currentUser.id);
  const [sortAsc, setSortAsc] = useState(false);

  return (
    <div className="app-content">
      <TableToolbar
        sortLabel="SLO Due"
        sortAsc={sortAsc}
        onToggleSort={() => setSortAsc(!sortAsc)}
      />

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
