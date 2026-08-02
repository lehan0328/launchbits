'use client';

import { DataTable } from '@/components/DataTable';
import { getOwnedColumns } from '@/components/columns';
import type { Launch } from '@/lib/types';

export default function DraftsClient({ drafts }: { drafts: Launch[] }) {
  return (
    <div className="app-content">
      <div className="page-header-bar">
        <h1 className="page-title">Drafts</h1>
      </div>

      <DataTable
        data={drafts}
        columns={getOwnedColumns()}
        emptyState={
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-title">No drafts</div>
            <p className="text-secondary text-sm">
              Launches saved as drafts will appear here.
            </p>
          </div>
        }
      />
    </div>
  );
}
