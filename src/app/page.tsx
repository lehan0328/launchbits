'use client';

import { useState } from 'react';
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
  const [sortAsc, setSortAsc] = useState(false);

  const ownedLaunches = launches;
  const pendingApproval: Launch[] = [];

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
