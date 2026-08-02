'use client';

import {
  DataTable,
  SectionHeader,
} from '@/components/DataTable';
import { getOwnedColumns, getPendingColumns } from '@/lib/columns';
import type { Launch } from '@/lib/types';

export default function DashboardClient({
  launches,
  pendingApproval,
}: {
  launches: Launch[];
  pendingApproval: Launch[];
}) {
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
