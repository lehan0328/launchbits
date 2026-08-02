import type { LaunchStatus, ReviewStatus, RiskLevel } from './types';

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));

  if (diffMs < 0) {
    if (diffDays === 0) return `in ${diffHours}h`;
    if (diffDays === 1) return 'in 1d';
    return `in ${diffDays}d`;
  } else {
    if (diffDays === 0) {
      if (diffHours === 0) return 'just now';
      return `${diffHours}h ago`;
    }
    if (diffDays === 1) return '1d ago';
    return `${diffDays}d ago`;
  }
}

/** CSS tag class for launch status */
export function statusTagClass(status: LaunchStatus): string {
  const map: Record<LaunchStatus, string> = {
    DRAFT: 'tag-draft',
    IN_REVIEW: 'tag-in-review',
    APPROVED: 'tag-approved',
    LAUNCHED: 'tag-launched',
    LAUNCHED_WITH_EXCEPTION: 'tag-exception',
    CANCELLED: 'tag-cancelled',
  };
  return map[status] || 'tag-draft';
}

export function statusLabel(status: LaunchStatus): string {
  const map: Record<LaunchStatus, string> = {
    DRAFT: 'Draft',
    IN_REVIEW: 'In Review',
    APPROVED: 'Approved',
    LAUNCHED: 'Launched',
    LAUNCHED_WITH_EXCEPTION: 'Exception',
    CANCELLED: 'Cancelled',
  };
  return map[status] || status;
}


export function reviewStatusLabel(status: ReviewStatus): string {
  const map: Record<ReviewStatus, string> = {
    NOT_REQUIRED: 'Not Required',
    FYI: 'FYI',
    PENDING_REVIEW: 'Pending',
    IN_PROGRESS: 'In Progress',
    NEEDS_WORK: 'Needs Work',
    APPROVED: 'Approved',
    DENIED: 'Denied',
  };
  return map[status] || status;
}

/** Risk display */
export function riskDotClass(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = { LOW: 'dot-green', MEDIUM: 'dot-orange', HIGH: 'dot-red' };
  return map[level] || 'dot-gray';
}

export function riskTagClass(level: RiskLevel): string {
  return `tag-risk-${level.toLowerCase()}`;
}

export function eventTypeLabel(eventType: string): string {
  const map: Record<string, string> = {
    LAUNCH_CREATED: 'created this launch card',
    LAUNCH_EDITED: 'edited the launch card',
    LAUNCH_UPDATED: 'updated the launch card',
    SUBMITTED_FOR_REVIEW: 'submitted for review',
    REVIEW_APPROVED: 'approved a review',
    REVIEW_CHANGES_REQUESTED: 'requested changes on a review',
    REVIEW_NEEDS_WORK: 'requested changes on',
    REVIEW_DENIED: 'denied',
    REVIEW_MARKED_FYI: 'marked a review as FYI',
    REVIEW_FYI: 'downgraded to FYI',
    REVIEW_REASSIGNED: 'reassigned',
    LAUNCH_APPROVED: 'all reviews approved — launch approved',
    LAUNCH_LAUNCHED: 'marked as launched',
    LAUNCHED_WITH_EXCEPTION: 'launched with exception',
    LAUNCH_CANCELLED: 'cancelled',
    EMERGENCY_BYPASS: 'emergency bypass activated',
    SLO_BREACHED: 'SLO breached',
  };
  return map[eventType] || eventType;
}

export function isBlockingReview(status: ReviewStatus): boolean {
  return ['PENDING_REVIEW', 'IN_PROGRESS', 'NEEDS_WORK', 'DENIED'].includes(status);
}
