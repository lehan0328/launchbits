// ============================================================================
// LAUNCHBITS — LAUNCH STATUS STATE MACHINE
// Enforces valid status transitions derived from Google's Ariane lifecycle.
// ============================================================================

import type { LaunchStatus } from './types';

/**
 * Valid transitions map.
 * Key = current status, Value = set of allowed next statuses.
 *
 * DRAFT → IN_REVIEW                     (on submit for review)
 * DRAFT → CANCELLED                     (owner abandons)
 * IN_REVIEW → APPROVED                  (all blocking reviews pass)
 * IN_REVIEW → LAUNCHED_WITH_EXCEPTION   (owner bypasses with justification)
 * IN_REVIEW → CANCELLED                 (owner cancels)
 * APPROVED → LAUNCHED                   (owner marks as shipped)
 * APPROVED → IN_REVIEW                  (re-open for additional review)
 * LAUNCHED_WITH_EXCEPTION → APPROVED    (deferred reviews complete)
 * LAUNCHED_WITH_EXCEPTION → LAUNCHED    (confirmed despite exception)
 */
const VALID_TRANSITIONS: Record<LaunchStatus, Set<LaunchStatus>> = {
  DRAFT: new Set(['IN_REVIEW', 'CANCELLED']),
  IN_REVIEW: new Set(['APPROVED', 'LAUNCHED_WITH_EXCEPTION', 'CANCELLED']),
  APPROVED: new Set(['LAUNCHED', 'IN_REVIEW']),
  LAUNCHED: new Set(), // Terminal state
  LAUNCHED_WITH_EXCEPTION: new Set(['APPROVED', 'LAUNCHED']),
  CANCELLED: new Set(), // Terminal state
};

/** Human-readable labels for each status (internal use only) */
const STATUS_LABELS: Record<LaunchStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  LAUNCHED: 'Launched',
  LAUNCHED_WITH_EXCEPTION: 'Launched with Exception',
  CANCELLED: 'Cancelled',
};

/**
 * Check if a status transition is valid.
 */
export function isValidTransition(
  from: LaunchStatus,
  to: LaunchStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.has(to) ?? false;
}

/**
 * Get all valid next statuses from the current status.
 */
export function getValidNextStatuses(current: LaunchStatus): LaunchStatus[] {
  return Array.from(VALID_TRANSITIONS[current] ?? []);
}

/**
 * Attempt a status transition. Throws if invalid.
 */
export function assertValidTransition(
  from: LaunchStatus,
  to: LaunchStatus,
): void {
  if (!isValidTransition(from, to)) {
    throw new Error(
      `Invalid status transition: ${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}. ` +
      `Allowed transitions from ${STATUS_LABELS[from]}: ${
        getValidNextStatuses(from).map(s => STATUS_LABELS[s]).join(', ') || 'none (terminal state)'
      }.`
    );
  }
}

/**
 * Check if a status is a terminal state (no further transitions allowed).
 */
export function isTerminalStatus(status: LaunchStatus): boolean {
  return (VALID_TRANSITIONS[status]?.size ?? 0) === 0;
}

/**
 * Check if a status indicates the launch is "active" (not terminal, not draft).
 */
export function isActiveStatus(status: LaunchStatus): boolean {
  return status === 'IN_REVIEW' || status === 'APPROVED' || status === 'LAUNCHED_WITH_EXCEPTION';
}
