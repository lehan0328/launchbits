'use client';

import { useState, useMemo } from 'react';
import {
  DataTable,
  TableToolbar,
  SectionHeader,
} from '@/components/DataTable';
import { store } from '@/lib/store';
import { getOwnedColumns, getPendingColumns } from '@/lib/columns';
import type { Launch } from '@/lib/types';

export default function DashboardPage() {
  const launches = store.getLaunches();
  const currentUser = store.getCurrentUser();
  const [sortAsc, setSortAsc] = useState(false);

  const ownedLaunches = launches;

  // Get launches that have pending reviews for the current user
  const pendingApproval = useMemo(() => {
    const pendingReviews = store.getPendingReviewsForUser(currentUser.id);
    // Deduplicate by launch — multiple reviews can point to the same launch
    const seen = new Set<string>();
    const result: Launch[] = [];
    for (const review of pendingReviews) {
      if (review.launch && !seen.has(review.launch_id)) {
        seen.add(review.launch_id);
        result.push(review.launch);
      }
    }
    return result;
  }, [currentUser.id]);

  return (
    <div className="app-content">
      {/* Section: Owned by you */}
      <SectionHeader title="Owned by you" count={ownedLaunches.length} />

      <TableToolbar
        sortAsc={sortAsc}
        onToggleSort={() => setSortAsc(!sortAsc)}
      />

      <DataTable
        data={ownedLaunches}
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
