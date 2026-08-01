'use client';

// ============================================================================
// LAUNCHBITS — SHARED COLUMN DEFINITIONS
// Reusable column configs for DataTable across pages.
// ============================================================================

import Link from 'next/link';
import { ColumnDef, statusTextClass } from '@/components/DataTable';
import { store } from '@/lib/store';
import type { Launch, LaunchReview, ReviewWithLaunch } from '@/lib/types';
import {
  statusLabel, formatDate, relativeTime,
  reviewStatusLabel, isBlockingReview,
} from '@/lib/utils';

// ============================================================================
// ReviewsCell — shared review progress indicator
// ============================================================================

export function ReviewsCell({ launchId }: { launchId: string }) {
  const reviews = store.getReviewsForLaunch(launchId);
  const approvedCount = reviews.filter(r => r.status === 'APPROVED').length;
  const requiredCount = reviews.filter(r => r.status !== 'FYI' && r.status !== 'NOT_REQUIRED').length;
  const pendingCount = reviews.filter(r => isBlockingReview(r.status)).length;
  const progressPct = requiredCount > 0 ? (approvedCount / requiredCount) * 100 : 0;
  const allDone = requiredCount > 0 && approvedCount === requiredCount;

  if (requiredCount === 0) {
    return <span className="text-muted text-sm">—</span>;
  }

  return (
    <div className="reviews-cell">
      <span className="reviews-count">{approvedCount}/{requiredCount}</span>
      <div className="reviews-bar">
        <div
          className={`reviews-bar-fill ${allDone ? 'reviews-bar-fill--done' : ''}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
      {pendingCount > 0 && (
        <span className="todo-badge">▸ {pendingCount} to-do{pendingCount !== 1 ? 's' : ''}</span>
      )}
    </div>
  );
}

// ============================================================================
// "Owned by you" columns — used on dashboard + /owned
// ============================================================================

export function getOwnedColumns(): ColumnDef<Launch>[] {
  return [
    {
      key: 'id',
      header: 'ID',
      className: 'col-id',
      render: (launch) => (
        <Link href={`/launches/${launch.id}`}>{launch.display_id}</Link>
      ),
    },
    {
      key: 'title',
      header: 'Launch title',
      className: 'col-title',
      render: (launch) => (
        <Link href={`/launches/${launch.id}`}>{launch.name}</Link>
      ),
    },
    {
      key: 'stage',
      header: 'Stage',
      className: 'col-stage',
      render: () => <span className="text-secondary">—</span>,
    },
    {
      key: 'date',
      header: 'Launch date',
      className: 'col-date',
      sortable: true,
      render: (launch) => launch.target_date ? formatDate(launch.target_date) : '—',
    },
    {
      key: 'status',
      header: 'Status',
      className: 'col-status',
      render: (launch) => (
        <span className={`status-text ${statusTextClass(launch.status)}`}>
          {statusLabel(launch.status)}
        </span>
      ),
    },
    {
      key: 'reviews',
      header: 'Reviews completed',
      className: 'col-reviews',
      render: (launch) => <ReviewsCell launchId={launch.id} />,
    },
  ];
}

// ============================================================================
// "Pending your approval" columns — dashboard pending section
// ============================================================================

export function getPendingColumns(): ColumnDef<Launch>[] {
  return [
    {
      key: 'id',
      header: 'ID',
      className: 'col-id',
      render: (launch) => (
        <Link href={`/launches/${launch.id}`}>{launch.display_id}</Link>
      ),
    },
    {
      key: 'title',
      header: 'Launch title',
      className: 'col-title',
      render: (launch) => (
        <Link href={`/launches/${launch.id}`}>{launch.name}</Link>
      ),
    },
    {
      key: 'role',
      header: 'Your role',
      render: () => <span className="text-secondary text-sm">—</span>,
    },
    {
      key: 'stage',
      header: 'Stage',
      className: 'col-stage',
      render: () => <span className="text-secondary">—</span>,
    },
    {
      key: 'date',
      header: 'Launch date',
      className: 'col-date',
      render: (launch) => launch.target_date ? formatDate(launch.target_date) : '—',
    },
    {
      key: 'status',
      header: 'Status',
      className: 'col-status',
      render: (launch) => (
        <span className={`status-text ${statusTextClass(launch.status)}`}>
          {statusLabel(launch.status)}
        </span>
      ),
    },
    { key: 'creator', header: 'Creator', render: () => '—' },
    { key: 'calendar', header: 'Primary Calendar', render: () => '—' },
  ];
}

// ============================================================================
// "Reviews" columns — /reviews page
// ============================================================================

export function getReviewColumns(): ColumnDef<ReviewWithLaunch>[] {
  return [
    {
      key: 'launch-id',
      header: 'Launch ID',
      className: 'col-id',
      render: (review) => (
        <Link href={`/launches/${review.launch_id}`}>
          {review.launch?.display_id || '—'}
        </Link>
      ),
    },
    {
      key: 'title',
      header: 'Launch title',
      className: 'col-title',
      render: (review) => (
        <Link href={`/launches/${review.launch_id}`}>
          {review.launch?.name || '—'}
        </Link>
      ),
    },
    {
      key: 'type',
      header: 'Review type',
      className: 'text-sm',
      render: (review) => review.label || '—',
    },
    {
      key: 'status',
      header: 'Review status',
      className: 'col-status',
      render: (review) => (
        <span className={`status-text ${statusTextClass(review.status)}`}>
          {reviewStatusLabel(review.status)}
        </span>
      ),
    },
    {
      key: 'slo',
      header: 'SLO due',
      className: 'col-date',
      render: (review) => {
        if (!review.slo_due_at) return '—';
        return (
          <span style={{ color: review.slo_breached ? 'var(--color-red)' : undefined }}>
            {review.slo_breached ? 'Overdue' : relativeTime(review.slo_due_at)}
          </span>
        );
      },
    },
    {
      key: 'risk',
      header: 'Risk',
      className: 'text-sm',
      render: (review) => review.launch?.risk_level || '—',
    },
    {
      key: 'target-date',
      header: 'Target date',
      className: 'col-date',
      render: (review) => {
        return review.launch?.target_date ? formatDate(review.launch.target_date) : '—';
      },
    },
    {
      key: 'actions',
      header: '',
      render: (review) => (
        <Link
          href={`/launches/${review.launch_id}`}
          className="review-action-link"
        >
          Review →
        </Link>
      ),
    },
  ];
}
