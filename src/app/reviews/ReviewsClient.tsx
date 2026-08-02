'use client';

import { useState, useMemo } from 'react';
import { DataTable, TableToolbar } from '@/components/DataTable';
import { getReviewColumns } from '@/components/columns';
import type { ReviewWithLaunch } from '@/lib/types';

const SORT_OPTIONS = [
  { value: 'display_id', label: 'ID' },
  { value: 'status', label: 'Review Status' },
  { value: 'target_date', label: 'Target Date' },
  { value: 'slo_due_at', label: 'SLO Due Date' },
];

function getSortValue(r: ReviewWithLaunch, key: string): string | number {
  switch (key) {
    case 'display_id':
      return r.launch?.display_id ?? 0;
    case 'status':
      return r.status;
    case 'target_date':
      return new Date(r.launch?.target_date || r.launch?.updated_at || '0').getTime();
    case 'slo_due_at':
      return new Date(r.slo_due_at || '9999').getTime();
    default:
      return 0;
  }
}

export default function ReviewsClient({
  pendingReviews,
}: {
  pendingReviews: ReviewWithLaunch[];
}) {
  const [sortField, setSortField] = useState('slo_due_at');
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    return [...pendingReviews].sort((a, b) => {
      const va = getSortValue(a, sortField);
      const vb = getSortValue(b, sortField);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    });
  }, [pendingReviews, sortField, sortAsc]);

  return (
    <div className="app-content">
      <TableToolbar
        sortOptions={SORT_OPTIONS}
        sortValue={sortField}
        onSortChange={setSortField}
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
