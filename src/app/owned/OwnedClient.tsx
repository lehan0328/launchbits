'use client';

import { useState, useMemo } from 'react';
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

export default function OwnedClient({ launches }: { launches: Launch[] }) {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const base = statusFilter === 'ALL'
      ? launches
      : launches.filter(l => l.status === statusFilter);

    return [...base].sort((a, b) => {
      const da = new Date(a.target_date || a.updated_at).getTime();
      const db = new Date(b.target_date || b.updated_at).getTime();
      return sortAsc ? da - db : db - da;
    });
  }, [launches, statusFilter, sortAsc]);

  return (
    <div className="app-content">
      <TableToolbar
        sortLabel="Launch Date"
        sortAsc={sortAsc}
        onToggleSort={() => setSortAsc(prev => !prev)}
        actions={
          <div className="toolbar-filter-group">
            <select
              className="toolbar-filter-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
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
