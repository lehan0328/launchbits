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
        <div className="card stat-card stat-card--active">
          <span className="stat-card-value">{stats.activeLaunches}</span>
          <div className="stat-card-info">
            <span className="stat-card-label">Active Launches</span>
            <span className="stat-card-detail">In review or approved</span>
          </div>
        </div>
        <div className="card stat-card stat-card--pending">
          <span className="stat-card-value">{stats.pendingReviews}</span>
          <div className="stat-card-info">
            <span className="stat-card-label">Pending Reviews</span>
            <span className="stat-card-detail">Awaiting your approval</span>
          </div>
        </div>
        <div className="card stat-card stat-card--approved">
          <span className="stat-card-value">{stats.recentlyApproved}</span>
          <div className="stat-card-info">
            <span className="stat-card-label">Recently Approved</span>
            <span className="stat-card-detail">Last 7 days</span>
          </div>
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
