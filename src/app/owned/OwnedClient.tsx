'use client';

import { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { getOwnedColumns } from '@/components/columns';
import type { Launch } from '@/lib/types';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All', dot: '' },
  { value: 'DRAFT', label: 'Draft', dot: 'filter-bar-dot--draft' },
  { value: 'IN_REVIEW', label: 'In Review', dot: 'filter-bar-dot--review' },
  { value: 'APPROVED', label: 'Approved', dot: 'filter-bar-dot--approved' },
  { value: 'LAUNCHED', label: 'Launched', dot: 'filter-bar-dot--launched' },
  { value: 'LAUNCHED_WITH_EXCEPTION', label: 'Exception', dot: 'filter-bar-dot--exception' },
  { value: 'CANCELLED', label: 'Cancelled', dot: 'filter-bar-dot--cancelled' },
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

      {/* Status filter bar */}
      <div className="filter-bar">
        {STATUS_FILTERS.map(f => {
          const count = f.value === 'ALL' ? launches.length : (statusCounts[f.value] || 0);
          // Hide filters with 0 count (except ALL and the active one)
          if (count === 0 && f.value !== 'ALL' && f.value !== activeFilter) return null;
          return (
            <button
              key={f.value}
              className={`filter-bar-item ${activeFilter === f.value ? 'filter-bar-item--active' : ''}`}
              onClick={() => setActiveFilter(f.value)}
            >
              {f.dot && <span className={`filter-bar-dot ${f.dot}`} />}
              {f.label}
              <span className="filter-bar-count">{count}</span>
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
