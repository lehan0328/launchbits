'use client';

import { useState, useMemo } from 'react';
import { DataTable, TableToolbar } from '@/components/DataTable';
import { getOwnedColumns } from '@/components/columns';
import type { Launch } from '@/lib/types';

export default function SubscribedClient({ launches }: { launches: Launch[] }) {
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    return [...launches].sort((a, b) => {
      const da = new Date(a.target_date || a.updated_at).getTime();
      const db = new Date(b.target_date || b.updated_at).getTime();
      return sortAsc ? da - db : db - da;
    });
  }, [launches, sortAsc]);

  return (
    <div className="app-content">
      <TableToolbar
        sortLabel="Launch Date"
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
