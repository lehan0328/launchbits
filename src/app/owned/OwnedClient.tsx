'use client';

import { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { getOwnedColumns } from '@/components/columns';
import type { Launch } from '@/lib/types';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'LAUNCHED', label: 'Launched' },
  { value: 'LAUNCHED_WITH_EXCEPTION', label: 'Launched with Exception' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export default function OwnedClient({ launches }: { launches: Launch[] }) {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filtered = statusFilter === 'ALL'
    ? launches
    : launches.filter(l => l.status === statusFilter);

  return (
    <div className="app-content">
      <div className="page-header-bar">
        <h1 className="page-title">Owned by you</h1>
      </div>

      {/* Filter toolbar — matches Ariane's dropdown approach */}
      <div className="owned-toolbar">
        <div className="owned-toolbar-filters">
          <label className="owned-toolbar-label">Status</label>
          <select
            className="owned-toolbar-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="owned-toolbar-count">
          {filtered.length} of {launches.length}
        </div>
      </div>

      <DataTable
        data={filtered}
        columns={getOwnedColumns()}
        emptyState={
          <div className="empty-state">
            <div className="empty-state-icon">🚀</div>
            <div className="empty-state-title">
              {statusFilter === 'ALL' ? 'No launches yet' : `No ${STATUS_OPTIONS.find(f => f.value === statusFilter)?.label.toLowerCase()} launches`}
            </div>
          </div>
        }
      />
    </div>
  );
}
