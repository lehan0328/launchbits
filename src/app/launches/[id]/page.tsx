'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { store } from '@/lib/store';
import type { LaunchReview } from '@/lib/types';
import {
  statusTagClass, statusLabel, riskDotClass, riskTagClass,
  reviewStatusLabel, formatDate, formatDateTime,
  relativeTime, eventTypeLabel, isBlockingReview,
} from '@/lib/utils';
import {
  DATA_LABELS, PURPOSE_LABELS, NETWORK_LABELS,
  AUTH_LABELS, SHARING_LABELS, mapLabels,
} from '@/lib/labels';

// ============================================================================
// Review status → CSS class mapping
// ============================================================================

function reviewStatusTagClass(status: string): string {
  const map: Record<string, string> = {
    PENDING_REVIEW: 'review-status-tag--pending',
    NEEDS_WORK: 'review-status-tag--needs-work',
    APPROVED: 'review-status-tag--approved',
    FYI: 'review-status-tag--fyi',
    NOT_REQUIRED: 'review-status-tag--not-required',
  };
  return map[status] || 'review-status-tag--pending';
}

// Review type → display group label
const REVIEW_GROUP_LABELS: Record<string, { label: string; icon: string }> = {
  PRODUCT: { label: 'Product', icon: '≡' },
  PRIVACY: { label: 'Privacy', icon: '🔒' },
  SECURITY: { label: 'Security', icon: '🛡' },
  LEGAL: { label: 'Legal & Compliance', icon: '⚖' },
  ENGINEERING: { label: 'Engineering', icon: '⚙' },
};

// Owner avatar color rotation
const AVATAR_COLORS = ['owner-avatar--blue', 'owner-avatar--green', 'owner-avatar--orange', 'owner-avatar--purple'];

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ============================================================================
// Main Component
// ============================================================================

export default function LaunchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const launch = store.getLaunchById(id);
  const reviews = launch ? store.getReviewsForLaunch(launch.id) : [];
  const events = launch ? store.getEventsForLaunch(launch.id) : [];

  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
  const [fyiExpanded, setFyiExpanded] = useState(false);

  if (!launch) {
    return (
      <div className="app-content">
        <div className="empty-state" style={{ paddingTop: 120 }}>
          <div className="empty-state-title">Launch not found</div>
          <Link href="/" className="btn btn-secondary" style={{ marginTop: 16 }}>← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const blockingReviews = reviews.filter(r => isBlockingReview(r.status));
  const approvedCount = reviews.filter(r => r.status === 'APPROVED').length;
  const requiredReviews = reviews.filter(r => r.status !== 'FYI' && r.status !== 'NOT_REQUIRED');
  const fyiReviews = reviews.filter(r => r.status === 'FYI' || r.status === 'NOT_REQUIRED');
  const requiredCount = requiredReviews.length;

  // Group required reviews by review_type
  const groupedReviews = groupReviewsByType(requiredReviews);

  // Owners from store
  const owners = [store.getCurrentUser()]; // MVP: just the creator

  return (
    <>
      {/* ============================================================ */}
      {/* Meta Bar (Ariane-style header) */}
      {/* ============================================================ */}
      <div className="launch-meta-bar">
        <div className="launch-meta-bar-left">
          <Link href="/" className="text-secondary" style={{ textDecoration: 'none', fontSize: 20 }}>←</Link>
          <span className="launch-meta-id">{launch.display_id}</span>
          <span className="launch-meta-title">{launch.name}</span>
        </div>

        <div className="launch-meta-fields">
          <div className="launch-meta-field">
            <span className="launch-meta-field-label">Stage</span>
            <span className="launch-meta-field-value">{launch.display_id}</span>
          </div>
          <div className="launch-meta-field">
            <span className="launch-meta-field-label">Status</span>
            <span className={`tag ${statusTagClass(launch.status)}`} style={{ marginLeft: 4 }}>
              {statusLabel(launch.status)}
            </span>
          </div>
          <div className="launch-meta-field">
            <span className="launch-meta-field-label">Launch Date</span>
            <span className="launch-meta-field-value">{formatDate(launch.target_date)}</span>
          </div>
          <div className="launch-meta-field">
            <span className="launch-meta-field-label">Reviews completed</span>
            <span className="launch-meta-field-value">{approvedCount}/{requiredCount}</span>
          </div>
        </div>

        <div className="launch-meta-bar-right">
          {(launch.status === 'DRAFT' || launch.status === 'IN_REVIEW') && (
            <Link href={`/launches/${launch.id}/edit`} className="btn btn-secondary btn-sm">Edit</Link>
          )}
          <button className="btn btn-secondary btn-sm">Subscribe</button>
          {launch.status === 'APPROVED' && (
            <button className="btn btn-primary btn-sm">Mark Launched</button>
          )}
          {launch.status === 'IN_REVIEW' && blockingReviews.length > 0 && (
            <button className="btn btn-warning btn-sm">Launch with Exception</button>
          )}
          <button className="btn btn-secondary btn-sm">Stage Actions ▾</button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Tab Navigation */}
      {/* ============================================================ */}
      <div className="launch-tabs">
        <button
          className={`launch-tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Launch details
          {blockingReviews.length > 0 && (
            <span className="launch-tab-badge">!</span>
          )}
        </button>
        <button
          className={`launch-tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Comments &amp; activity
        </button>
      </div>

      {/* ============================================================ */}
      {/* Content: Details Tab */}
      {/* ============================================================ */}
      {activeTab === 'details' && (
        <div className="detail-layout">
          {/* Left Sidebar */}
          <div className="detail-sidebar">
            {/* Warning Banner (if draft or missing info) */}
            {launch.status === 'DRAFT' && (
              <div className="detail-warning-banner">
                <span>⚠ Missing launch information</span>
                <Link href={`/launches/new`} className="review-action-link">Edit</Link>
              </div>
            )}

            {/* Description */}
            {launch.description && (
              <p className="detail-description">{launch.description}</p>
            )}

            {/* Owners */}
            <div className="detail-field">
              <span className="detail-field-label">Owners</span>
              <div className="owner-chips">
                {owners.map((owner, i) => (
                  <span key={owner.id} className="owner-chip">
                    <span className={`owner-avatar ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                      {getInitials(owner.display_name)}
                    </span>
                    {owner.display_name}
                  </span>
                ))}
              </div>
            </div>

            {/* Key details */}
            <div className="detail-field">
              <span className="detail-field-label">Risk</span>
              <div className="detail-field-value flex items-center gap-1">
                <span className={`status-dot ${riskDotClass(launch.risk_level)}`} />
                <span className={riskTagClass(launch.risk_level)}>{launch.risk_level}</span>
              </div>
            </div>

            <div className="detail-field">
              <span className="detail-field-label">Target</span>
              <span className="detail-field-value">{formatDate(launch.target_date)}</span>
            </div>

            <div className="detail-field">
              <span className="detail-field-label">Created</span>
              <span className="detail-field-value">{formatDate(launch.created_at)}</span>
            </div>

            {launch.github_repo && (
              <div className="detail-field">
                <span className="detail-field-label">GitHub</span>
                <span className="detail-field-value truncate">{launch.github_repo} #{launch.github_pr_number}</span>
              </div>
            )}

            <div className="detail-field">
              <span className="detail-field-label">Version</span>
              <span className="detail-field-value">v{launch.version}</span>
            </div>

            {/* Questionnaire Summary (collapsible) */}
            <CollapsibleSection title="Questionnaire Summary" defaultOpen>
              <div className="questionnaire-summary">
                <QuestionnaireSummaryItem label="Data Classification" value={mapLabels(launch.q_data_classes, DATA_LABELS)} />
                <QuestionnaireSummaryItem label="Processing Purpose" value={mapLabels(launch.q_processing_purpose, PURPOSE_LABELS)} />
                <QuestionnaireSummaryItem label="Network Exposure" value={mapLabels(launch.q_network_exposure, NETWORK_LABELS)} />
                <QuestionnaireSummaryItem label="Auth & Secrets" value={mapLabels(launch.q_auth_secrets, AUTH_LABELS)} />
                <QuestionnaireSummaryItem label="External Sharing" value={mapLabels(launch.q_external_sharing, SHARING_LABELS)} />
              </div>
            </CollapsibleSection>

            {/* Placeholder collapsible sections (Ariane-style) */}
            <CollapsibleSection title="All members" />
            <CollapsibleSection title="All documents" />

            <button className="btn btn-secondary mt-4" style={{ width: '100%' }}>Export Audit Report</button>
          </div>

          {/* Main Content: Reviews Table */}
          <div className="detail-main">
            {/* Readiness banner */}
            <ReadinessBanner status={launch.status} blockingCount={blockingReviews.length} />

            <h2 className="reviews-section-title">Required Reviews</h2>

            <table className="reviews-table">
              <thead>
                <tr>
                  <th>Review</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Your Todos</th>
                </tr>
              </thead>
              <tbody>
                {groupedReviews.map(group => (
                  <ReviewGroup key={group.type} group={group} launchId={launch.id} />
                ))}
              </tbody>
            </table>

            {/* FYI reviews collapsible */}
            {fyiReviews.length > 0 && (
              <>
                <button className="fyi-toggle" onClick={() => setFyiExpanded(!fyiExpanded)}>
                  <span className={`fyi-chevron ${fyiExpanded ? 'expanded' : ''}`}>▸</span>
                  {fyiReviews.length} optional (FYI) review{fyiReviews.length !== 1 ? 's' : ''}
                </button>
                <div className={`sidebar-collapse-content ${fyiExpanded ? 'expanded' : ''}`}>
                  <div className="sidebar-collapse-inner">
                    <table className="reviews-table">
                      <tbody>
                        {fyiReviews.map(review => (
                          <ReviewRow key={review.id} review={review} launchId={launch.id} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Exception justification */}
            {launch.launch_justification && (
              <div className="detail-warning-banner mt-4" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <span style={{ fontWeight: 600 }}>Exception Justification</span>
                <span style={{ fontWeight: 400 }}>{launch.launch_justification}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Content: Comments & Activity Tab */}
      {/* ============================================================ */}
      {activeTab === 'activity' && (
        <div className="detail-main activity-tab-content" style={{ padding: '24px 32px' }}>
          <h2 className="reviews-section-title">Activity</h2>
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
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <div className="empty-state-title">No activity yet</div>
                <p className="text-secondary text-sm" style={{ marginTop: 8 }}>
                  Events will appear here as the launch progresses.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface ReviewGroupData {
  type: string;
  label: string;
  icon: string;
  reviews: LaunchReview[];
}

function groupReviewsByType(reviews: LaunchReview[]): ReviewGroupData[] {
  const groups = new Map<string, LaunchReview[]>();

  for (const review of reviews) {
    const type = review.review_type || 'PRODUCT';
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type)!.push(review);
  }

  return Array.from(groups.entries()).map(([type, reviews]) => {
    const groupInfo = REVIEW_GROUP_LABELS[type] || { label: type, icon: '≡' };
    return { type, label: groupInfo.label, icon: groupInfo.icon, reviews };
  });
}

function ReviewGroup({ group, launchId }: { group: ReviewGroupData; launchId: string }) {
  return (
    <>
      <tr className="review-group-header">
        <td colSpan={4}>
          <span className="review-group-icon">{group.icon}</span>
          {group.label}
        </td>
      </tr>
      {group.reviews.map(review => (
        <ReviewRow key={review.id} review={review} launchId={launchId} />
      ))}
    </>
  );
}

function ReviewRow({ review, launchId }: { review: LaunchReview; launchId: string }) {
  return (
    <tr>
      <td>
        <span className="review-name-link">{review.label}</span>
      </td>
      <td>
        <span className={`review-status-tag ${reviewStatusTagClass(review.status)}`}>
          {reviewStatusLabel(review.status)}
        </span>
      </td>
      <td>
        {review.reviewed_by_name ? (
          <span className="assignee-cell">
            <span className="assignee-avatar">{getInitials(review.reviewed_by_name)}</span>
            {review.reviewed_by_name}
          </span>
        ) : (
          <span className="text-muted text-sm">—</span>
        )}
      </td>
      <td>
        {isBlockingReview(review.status) ? (
          <Link href={`/launches/${launchId}`} className="review-action-link">
            Review →
          </Link>
        ) : (
          <span className="text-muted text-sm">—</span>
        )}
      </td>
    </tr>
  );
}

function ReadinessBanner({ status, blockingCount }: { status: string; blockingCount: number }) {
  const config = getBannerConfig(status, blockingCount);
  return (
    <div className={`readiness-banner ${config.className}`} style={{ marginBottom: 16 }}>
      <span className={`status-dot ${config.dotClass}`} />
      <div>
        <div className="font-medium">{config.text}</div>
      </div>
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

function CollapsibleSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children?: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="sidebar-collapse">
      <div className="sidebar-collapse-header" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className={`sidebar-collapse-chevron ${open ? 'expanded' : ''}`}>▸</span>
      </div>
      <div className={`sidebar-collapse-content ${open ? 'expanded' : ''}`}>
        <div className="sidebar-collapse-inner">{children}</div>
      </div>
    </div>
  );
}

function QuestionnaireSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="questionnaire-label">{label}</div>
      <div className="questionnaire-value">{value}</div>
    </div>
  );
}
