'use client';

import { useState, useMemo } from 'react';
import { DataTable, TableToolbar } from '@/components/DataTable';
import { getOwnedColumns } from '@/components/columns';
import type { Launch } from '@/lib/types';

const SORT_OPTIONS = [
  { value: 'target_date', label: 'Launch Date' },
  { value: 'updated_at', label: 'Last Updated' },
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Status' },
];

function getSortValue(launch: Launch, key: string): string | number {
  switch (key) {
    case 'target_date':
      return new Date(launch.target_date || launch.updated_at).getTime();
    case 'updated_at':
      return new Date(launch.updated_at).getTime();
    case 'name':
      return launch.name.toLowerCase();
    case 'status':
      return launch.status;
    default:
      return 0;
  }
}

export default function SubscribedClient({ launches }: { launches: Launch[] }) {
  const [sortField, setSortField] = useState('target_date');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    return [...launches].sort((a, b) => {
      const va = getSortValue(a, sortField);
      const vb = getSortValue(b, sortField);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    });
  }, [launches, sortField, sortAsc]);

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
        columns={getOwnedColumns()}
        emptyState={
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <div className="empty-state-title">No subscriptions</div>
            <p className="text-secondary text-sm">
              Subscribe to launches from their detail page to track them here.
            </p>
          </div>
        }
      />

      <div className="table-footer">
        Showing {sorted.length} of {launches.length}
      </div>
    </div>
  );
}
