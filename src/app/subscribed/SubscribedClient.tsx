'use client';

import { DataTable } from '@/components/DataTable';
import { getOwnedColumns } from '@/components/columns';
import type { Launch } from '@/lib/types';

export default function SubscribedClient({ launches }: { launches: Launch[] }) {
  return (
    <div className="app-content">
      <div className="page-header-bar">
        <h1 className="page-title">Subscribed</h1>
      </div>

      <DataTable
        data={launches}
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
    </div>
  );
}
