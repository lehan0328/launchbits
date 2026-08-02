// ============================================================================
// LAUNCHBITS — ROLE-BASED PERMISSIONS
// Derived from Google's Ariane access model:
//   - Member:   create launches, view/edit own launches
//   - Reviewer: above + approve/deny reviews assigned to them
//   - Admin:    above + manage team, settings, view all, exception launch
//
// Review-level governance from Ariane's ApproverConfig flags (Prompt 2 §5):
//   - owner_approval_disallowed: launch owners cannot self-approve
//   - access_restricted: only designated reviewers can act
//   - fyi_allowed: whether a reviewer can downgrade to FYI
// ============================================================================

import type { User, Launch, LaunchReview } from './types';

// --- Role hierarchy (higher index = more permissions) ---
const ROLE_LEVEL: Record<User['role'], number> = {
  member: 0,
  reviewer: 1,
  admin: 2,
};

/**
 * Check if user has at least the given role level.
 */
export function hasRole(user: User, requiredRole: User['role']): boolean {
  return ROLE_LEVEL[user.role] >= ROLE_LEVEL[requiredRole];
}

// ============================================================================
// Launch Permissions (Design Doc §5.1 — API Route Auth)
// ============================================================================

/** POST /api/launches — Auth: Member (any role can create) */
export function canCreateLaunch(_user: User): boolean {
  return true;
}

/** GET /api/launches/:id — Auth: Member (owner or admin) */
export function canViewLaunch(user: User, _launch: Launch, ownerIds: string[]): boolean {
  if (hasRole(user, 'admin')) return true;
  return ownerIds.includes(user.id);
}

/** PATCH /api/launches/:id — Auth: Owner/Admin (only DRAFT or IN_REVIEW) */
export function canEditLaunch(user: User, launch: Launch, ownerIds: string[]): boolean {
  if (launch.status !== 'DRAFT' && launch.status !== 'IN_REVIEW') return false;
  if (hasRole(user, 'admin')) return true;
  return ownerIds.includes(user.id);
}

/** POST /api/launches/:id/submit — Auth: Owner (DRAFT only) */
export function canSubmitForReview(user: User, launch: Launch, ownerIds: string[]): boolean {
  if (launch.status !== 'DRAFT') return false;
  if (hasRole(user, 'admin')) return true;
  return ownerIds.includes(user.id);
}

/** POST /api/launches/:id/launch — Auth: Owner/Admin (APPROVED → LAUNCHED) */
export function canMarkLaunched(user: User, launch: Launch, ownerIds: string[]): boolean {
  if (launch.status !== 'APPROVED' && launch.status !== 'LAUNCHED_WITH_EXCEPTION') return false;
  if (hasRole(user, 'admin')) return true;
  return ownerIds.includes(user.id);
}

/** POST /api/launches/:id/launch-with-exception — Auth: Admin only */
export function canLaunchWithException(user: User, launch: Launch): boolean {
  if (launch.status !== 'IN_REVIEW') return false;
  return hasRole(user, 'admin');
}

/** POST /api/launches/:id/cancel — Auth: Owner/Admin */
export function canCancelLaunch(user: User, launch: Launch, ownerIds: string[]): boolean {
  if (launch.status === 'LAUNCHED' || launch.status === 'CANCELLED') return false;
  if (hasRole(user, 'admin')) return true;
  return ownerIds.includes(user.id);
}

// ============================================================================
// Review Permissions (Design Doc §5.2 + Ariane ApproverConfig — Prompt 2 §5)
//
// From launchbits_mvp_design_doc.md line 571-573:
//   1. If owner_approval_disallowed: reject if reviewer === launch owner
//   2. If access_restricted: reject if reviewer not in reviewer group
//
// From launchbits_mvp_design_doc.md line 920:
//   FYI button only shown if fyi_allowed = true
// ============================================================================

/**
 * Check if a user can approve/deny a specific review bit.
 *
 * Rules (from Ariane's Slack handler logic — design doc §8.6):
 * 1. Must have at least 'reviewer' role
 * 2. If owner_approval_disallowed, launch owners cannot self-approve
 * 3. If access_restricted, only designated reviewers can act
 */
export function canReview(
  user: User,
  review: LaunchReview,
  launchOwnerIds: string[],
): boolean {
  // Ariane: owner_approval_disallowed check (design doc line 995)
  if (review.owner_approval_disallowed && launchOwnerIds.includes(user.id)) {
    return false;
  }

  // Ariane: access_restricted check (design doc line 999)
  // In MVP: check against reviewer_emails on the review definition
  // In future: check against Slack channel/group membership
  if (review.access_restricted) {
    // If there's a specific reviewer assigned and it's not this user, deny
    if (review.reviewed_by && review.reviewed_by !== user.id) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a reviewer can downgrade a review to FYI status.
 * Only allowed if fyi_allowed = true on the review bit (design doc line 920, 1019).
 */
export function canDowngradeToFyi(
  user: User,
  review: LaunchReview,
  launchOwnerIds: string[],
): boolean {
  if (!canReview(user, review, launchOwnerIds)) return false;
  return review.fyi_allowed;
}

// ============================================================================
// Settings / Admin Permissions (Design Doc §3.6)
// ============================================================================

/** Admin only — manage organization settings */
export function canManageSettings(user: User): boolean {
  return hasRole(user, 'admin');
}

/** Admin only — manage team members and roles */
export function canManageTeam(user: User): boolean {
  return hasRole(user, 'admin');
}

/** Admin only — edit review definitions and policy rules */
export function canManagePolicies(user: User): boolean {
  return hasRole(user, 'admin');
}

// ============================================================================
// Audit Permissions (Design Doc §5.3)
// ============================================================================

/** GET /api/launches/:id/events — Auth: Member (any org member) */
export function canViewLaunchEvents(_user: User): boolean {
  return true;
}

/** GET /api/launches/:id/audit-export — Auth: Admin only */
export function canExportAudit(user: User): boolean {
  return hasRole(user, 'admin');
}

/** GET /api/org/audit-export — Auth: Admin only */
export function canExportOrgAudit(user: User): boolean {
  return hasRole(user, 'admin');
}
