'use client';

import {
  DataTable,
  SectionHeader,
} from '@/components/DataTable';
import { getOwnedColumns, getPendingColumns } from '@/components/columns';
import type { Launch } from '@/lib/types';

interface DashboardStats {
  activeLaunches: number;
  pendingReviews: number;
  recentlyApproved: number;
}

export default function DashboardClient({
  launches,
  pendingApproval,
  stats,
}: {
  launches: Launch[];
  pendingApproval: Launch[];
  stats: DashboardStats;
}) {
  return (
    <div className="app-content">
      {/* Summary stat cards */}
      <div className="dashboard-stats">
        <div className="card stat-card">
          <div className="stat-card-label">Active Launches</div>
          <div className="stat-card-value">{stats.activeLaunches}</div>
          <div className="stat-card-detail">In review or approved</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-label">Pending Reviews</div>
          <div className="stat-card-value">{stats.pendingReviews}</div>
          <div className="stat-card-detail">Awaiting your approval</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-label">Recently Approved</div>
          <div className="stat-card-value">{stats.recentlyApproved}</div>
          <div className="stat-card-detail">Last 7 days</div>
        </div>
      </div>

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
        className="mt-8"
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
