'use client';

import { use } from 'react';
import Link from 'next/link';
import { store } from '@/lib/store';
import {
  statusTagClass, statusLabel, riskDotClass, riskTagClass,
  reviewDotColor, reviewStatusLabel,
  formatDate, formatDateTime, relativeTime,
  eventTypeLabel, isBlockingReview,
} from '@/lib/utils';
import {
  DATA_LABELS, PURPOSE_LABELS, NETWORK_LABELS,
  AUTH_LABELS, SHARING_LABELS, mapLabels,
} from '@/lib/labels';

export default function LaunchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const launch = store.getLaunchById(id);
  const reviews = launch ? store.getReviewsForLaunch(launch.id) : [];
  const events = launch ? store.getEventsForLaunch(launch.id) : [];

  if (!launch) {
    return (
      <div className="app-content">
        <div className="empty-state">
          <div className="empty-state-title">Launch not found</div>
          <Link href="/" className="btn btn-secondary" style={{ marginTop: 16 }}>← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const blockingReviews = reviews.filter(r => isBlockingReview(r.status));
  const approvedCount = reviews.filter(r => r.status === 'APPROVED').length;
  const requiredCount = reviews.filter(r => r.status !== 'FYI' && r.status !== 'NOT_REQUIRED').length;
  const progressPct = requiredCount > 0 ? (approvedCount / requiredCount) * 100 : 0;

  const banner = getBannerConfig(launch.status, blockingReviews.length);

  return (
    <>
      <header className="app-header">
        <Link href="/" className="text-secondary text-sm" style={{ textDecoration: 'none' }}>← Launches</Link>
        <div className="flex items-center gap-2">
          {launch.status === 'APPROVED' && (
            <button className="btn btn-primary btn-sm">Mark Launched</button>
          )}
          {launch.status === 'IN_REVIEW' && blockingReviews.length > 0 && (
            <button className="btn btn-warning btn-sm">Launch with Exception</button>
          )}
          <button className="btn btn-secondary btn-sm">Edit Launch</button>
        </div>
      </header>

      <div className="app-content" style={{ maxWidth: 1344 }}>
        {/* Title Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="launch-display-id">#{launch.display_id}</span>
          <span className={`tag ${statusTagClass(launch.status)}`}>{statusLabel(launch.status)}</span>
          <span className="flex items-center gap-1">
            <span className={`status-dot ${riskDotClass(launch.risk_level)}`} />
            <span className={`text-sm font-medium ${riskTagClass(launch.risk_level)}`}>{launch.risk_level}</span>
          </span>
        </div>
        <h1 className="page-title mb-2">{launch.name}</h1>
        {launch.description && <p className="text-secondary text-sm mb-6">{launch.description}</p>}

        {/* Readiness Banner */}
        <div className={`readiness-banner ${banner.className}`}>
          <span className={`status-dot ${banner.dotClass}`} />
          <div>
            <div className="font-medium">{banner.text}</div>
            {blockingReviews.length > 0 && launch.status === 'IN_REVIEW' && (
              <div className="text-xs" style={{ marginTop: 4, opacity: 0.8 }}>
                Waiting on: {blockingReviews.map(r => r.label).join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Two-column layout */}
        <div className="detail-grid">
          {/* Left: Reviews & Activity */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="page-subtitle">Reviews &amp; Approvals</h2>
              <span className="text-secondary text-sm">
                {approvedCount} of {requiredCount} blocking reviews approved
              </span>
            </div>

            {requiredCount > 0 && (
              <div className="progress-bar-track mb-4" style={{ height: 8 }}>
                <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
              </div>
            )}

            {/* Review Cards */}
            <div className="flex flex-col gap-2">
              {reviews.map(review => (
                <div key={review.id} className="card review-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`status-dot status-dot--lg ${reviewDotColor(review.status)}`} />
                      <div>
                        <div className="review-card-label">{review.label}</div>
                        <div className="review-card-meta">
                          {reviewStatusLabel(review.status)}
                          {review.reviewed_by_name && ` · ${review.reviewed_by_name}`}
                          {review.reviewed_at && ` · ${formatDateTime(review.reviewed_at)}`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {review.slo_due_at && review.status === 'PENDING_REVIEW' && (
                    <div className={`review-slo ${review.slo_breached ? 'review-slo--breached' : ''}`}>
                      SLO: {review.slo_breached
                        ? `overdue — was due ${formatDate(review.slo_due_at)}`
                        : `due ${relativeTime(review.slo_due_at)}`}
                    </div>
                  )}

                  {review.trigger_reason && (
                    <div className="review-trigger">
                      Why required: {review.trigger_reason}
                    </div>
                  )}

                  {review.notes && (
                    <div className="review-notes">
                      &ldquo;{review.notes}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Exception Justification */}
            {launch.launch_justification && (
              <div className="card mt-4 exception-card">
                <div className="exception-card-title">Exception Justification</div>
                <p className="exception-card-body">{launch.launch_justification}</p>
              </div>
            )}

            {/* Activity Log */}
            <h2 className="page-subtitle mt-8 mb-3">Activity</h2>
            <div className="card" style={{ padding: 0 }}>
              <div className="event-log">
                {events.map(event => (
                  <div key={event.id} className="event-item">
                    <div className="event-time">{formatDateTime(event.performed_at)}</div>
                    <div className="event-description">
                      <span className="event-actor">{event.performed_by_name || 'System'}</span>
                      {' '}{eventTypeLabel(event.event_type)}
                      {event.notes && <span className="text-muted"> — {event.notes}</span>}
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="event-empty">No events yet</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Details + Questionnaire */}
          <div>
            <div className="card detail-sidebar-card">
              <h3 className="detail-sidebar-heading">Details</h3>
              <div className="detail-list">
                <div className="detail-row">
                  <span className="detail-label">Status</span>
                  <span className={`tag ${statusTagClass(launch.status)}`}>{statusLabel(launch.status)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Risk</span>
                  <span className="flex items-center gap-1">
                    <span className={`status-dot ${riskDotClass(launch.risk_level)}`} />
                    <span className={riskTagClass(launch.risk_level)}>{launch.risk_level}</span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Target</span>
                  <span>{formatDate(launch.target_date)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Created</span>
                  <span>{formatDate(launch.created_at)}</span>
                </div>
                {launch.github_repo && (
                  <div className="detail-row">
                    <span className="detail-label">GitHub</span>
                    <span className="truncate" style={{ maxWidth: 160 }}>{launch.github_repo} #{launch.github_pr_number}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Version</span>
                  <span>v{launch.version}</span>
                </div>
              </div>
            </div>

            <div className="card mt-3 detail-sidebar-card">
              <h3 className="detail-sidebar-heading">Questionnaire Summary</h3>
              <div className="questionnaire-summary">
                <QuestionnaireSummaryItem label="Data Classification" value={mapLabels(launch.q_data_classes, DATA_LABELS)} />
                <QuestionnaireSummaryItem label="Processing Purpose" value={mapLabels(launch.q_processing_purpose, PURPOSE_LABELS)} />
                <QuestionnaireSummaryItem label="Network Exposure" value={mapLabels(launch.q_network_exposure, NETWORK_LABELS)} />
                <QuestionnaireSummaryItem label="Auth & Secrets" value={mapLabels(launch.q_auth_secrets, AUTH_LABELS)} />
                <QuestionnaireSummaryItem label="External Sharing" value={mapLabels(launch.q_external_sharing, SHARING_LABELS)} />
              </div>
            </div>

            <button className="btn btn-secondary mt-3" style={{ width: '100%' }}>Export Audit Report</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function QuestionnaireSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="questionnaire-label">{label}</div>
      <div className="questionnaire-value">{value}</div>
    </div>
  );
}

function getBannerConfig(status: string, blockingCount: number) {
  if (status === 'IN_REVIEW') {
    if (blockingCount === 0) {
      return { className: 'ready', dotClass: 'dot-green', text: 'All blocking reviews approved — ready for production.' };
    }
    return {
      className: 'blocked',
      dotClass: 'dot-red',
      text: `${blockingCount} review${blockingCount > 1 ? 's' : ''} pending — launch is blocked.`,
    };
  }
  if (status === 'APPROVED') {
    return { className: 'ready', dotClass: 'dot-green', text: 'All reviews approved. Ready to launch.' };
  }
  if (status === 'LAUNCHED_WITH_EXCEPTION') {
    return { className: 'warning', dotClass: 'dot-orange', text: 'Launched with exception. Outstanding reviews must be completed.' };
  }
  return { className: 'draft', dotClass: 'dot-gray', text: 'This launch is in draft. Complete the questionnaire and submit for review.' };
}
