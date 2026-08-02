'use client';

import { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { getOwnedColumns } from '@/components/columns';
import type { Launch } from '@/lib/types';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'LAUNCHED', label: 'Launched' },
  { value: 'LAUNCHED_WITH_EXCEPTION', label: 'Exception' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export default function OwnedClient({ launches }: { launches: Launch[] }) {
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const filtered = activeFilter === 'ALL'
    ? launches
    : launches.filter(l => l.status === activeFilter);

  // Compute counts for each status
  const statusCounts = launches.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="app-content">
      <div className="page-header-bar">
        <h1 className="page-title">Owned by you</h1>
      </div>

      {/* Status filter chips */}
      <div className="filter-chips">
        {STATUS_FILTERS.map(f => {
          const count = f.value === 'ALL' ? launches.length : (statusCounts[f.value] || 0);
          // Hide filters with 0 count (except ALL and the active one)
          if (count === 0 && f.value !== 'ALL' && f.value !== activeFilter) return null;
          return (
            <button
              key={f.value}
              className={`filter-chip ${activeFilter === f.value ? 'filter-chip--active' : ''}`}
              onClick={() => setActiveFilter(f.value)}
            >
              {f.label}
              <span className="filter-chip-count">{count}</span>
            </button>
          );
        })}
      </div>

      <DataTable
        data={filtered}
        columns={getOwnedColumns()}
        emptyState={
          <div className="empty-state">
            <div className="empty-state-icon">🚀</div>
            <div className="empty-state-title">
              {activeFilter === 'ALL' ? 'No launches yet' : `No ${STATUS_FILTERS.find(f => f.value === activeFilter)?.label.toLowerCase()} launches`}
            </div>
          </div>
        }
      />

      <div className="table-footer">
        Showing {filtered.length} of {launches.length}
      </div>
    </div>
  );
}
