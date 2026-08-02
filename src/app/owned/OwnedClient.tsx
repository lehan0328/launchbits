'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { DataTable, TableToolbar } from '@/components/DataTable';
import { getOwnedColumns } from '@/components/columns';
import type { Launch } from '@/lib/types';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'LAUNCHED', label: 'Launched' },
  { value: 'LAUNCHED_WITH_EXCEPTION', label: 'Exception' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

const SORT_OPTIONS = [
  { value: 'display_id', label: 'ID' },
  { value: 'risk_level', label: 'Stage' },
  { value: 'target_date', label: 'Launch Date' },
  { value: 'status', label: 'Status' },
];

function getSortValue(launch: Launch, key: string): string | number {
  switch (key) {
    case 'display_id':
      return launch.display_id;
    case 'risk_level':
      return launch.risk_level;
    case 'target_date':
      return new Date(launch.target_date || launch.updated_at).getTime();
    case 'status':
      return launch.status;
    default:
      return 0;
  }
}

export default function OwnedClient({ launches }: { launches: Launch[] }) {
  const params = useSearchParams();
  const urlStatus = params.get('status') || 'ALL';
  const [prevUrlStatus, setPrevUrlStatus] = useState(urlStatus);
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus);
  const [sortField, setSortField] = useState('target_date');
  const [sortAsc, setSortAsc] = useState(false);

  // Adjust state during render when URL param changes (React-recommended pattern)
  if (urlStatus !== prevUrlStatus) {
    setPrevUrlStatus(urlStatus);
    setStatusFilter(urlStatus);
  }

  const filtered = useMemo(() => {
    const base = statusFilter === 'ALL'
      ? launches
      : launches.filter(l => l.status === statusFilter);

    return [...base].sort((a, b) => {
      const va = getSortValue(a, sortField);
      const vb = getSortValue(b, sortField);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    });
  }, [launches, statusFilter, sortField, sortAsc]);

  return (
    <div className="app-content">
      <TableToolbar
        sortOptions={SORT_OPTIONS}
        sortValue={sortField}
        onSortChange={setSortField}
        sortAsc={sortAsc}
        onToggleSort={() => setSortAsc(prev => !prev)}
        filters={
          <select
            className="toolbar-filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        }
      />

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

      <div className="table-footer">
        Showing {filtered.length} of {launches.length}
      </div>
    </div>
  );
}
