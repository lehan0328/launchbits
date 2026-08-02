import { describe, test, expect } from 'vitest';
import {
  hasRole,
  canCreateLaunch,
  canEditLaunch,
  canSubmitForReview,
  canLaunchWithException,
  canCancelLaunch,
  canReview,
  canDowngradeToFyi,
  canManageSettings,
} from '@/lib/permissions';
import type { User, Launch, LaunchReview } from '@/lib/types';

// ── Test Fixtures ────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  org_id: 'org-1',
  email: 'test@example.com',
  display_name: 'Test User',
  slack_user_id: null,
  avatar_url: null,
  role: 'member',
  ...overrides,
});

const makeLaunch = (overrides: Partial<Launch> = {}): Launch => ({
  id: 'launch-1',
  org_id: 'org-1',
  created_by: 'user-1',
  name: 'Test Launch',
  description: null,
  status: 'DRAFT',
  risk_level: 'LOW',
  version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
} as Launch);

const makeReview = (overrides: Partial<LaunchReview> = {}): LaunchReview => ({
  id: 'review-1',
  launch_id: 'launch-1',
  definition_id: 'def-1',
  status: 'PENDING_REVIEW',
  reviewed_by: null,
  notes: null,
  fyi_allowed: true,
  owner_approval_disallowed: false,
  access_restricted: false,
  slo_due_at: null,
  reviewed_at: null,
  created_at: new Date().toISOString(),
  label: 'Privacy Review',
  review_type: 'PRIVACY',
  ...overrides,
} as LaunchReview);

// ── Tests ────────────────────────────────────────────────────────────────────

describe('permissions', () => {
  // ── Role Hierarchy ─────────────────────────────────────────────────────────

  describe('hasRole', () => {
    test('admin has reviewer role', () => {
      expect(hasRole(makeUser({ role: 'admin' }), 'reviewer')).toBe(true);
    });

    test('admin has member role', () => {
      expect(hasRole(makeUser({ role: 'admin' }), 'member')).toBe(true);
    });

    test('reviewer has member role', () => {
      expect(hasRole(makeUser({ role: 'reviewer' }), 'member')).toBe(true);
    });

    test('member does not have reviewer role', () => {
      expect(hasRole(makeUser({ role: 'member' }), 'reviewer')).toBe(false);
    });

    test('member does not have admin role', () => {
      expect(hasRole(makeUser({ role: 'member' }), 'admin')).toBe(false);
    });
  });

  // ── Launch Permissions ─────────────────────────────────────────────────────

  describe('canCreateLaunch', () => {
    test('any user can create a launch', () => {
      expect(canCreateLaunch(makeUser({ role: 'member' }))).toBe(true);
    });
  });

  describe('canEditLaunch', () => {
    test('owner can edit DRAFT launch', () => {
      const user = makeUser({ id: 'owner' });
      const launch = makeLaunch({ status: 'DRAFT' });
      expect(canEditLaunch(user, launch, ['owner'])).toBe(true);
    });

    test('non-owner cannot edit', () => {
      const user = makeUser({ id: 'other' });
      const launch = makeLaunch({ status: 'DRAFT' });
      expect(canEditLaunch(user, launch, ['owner'])).toBe(false);
    });

    test('admin can edit any DRAFT', () => {
      const admin = makeUser({ id: 'admin-1', role: 'admin' });
      const launch = makeLaunch({ status: 'DRAFT' });
      expect(canEditLaunch(admin, launch, ['owner'])).toBe(true);
    });

    test('cannot edit APPROVED launch', () => {
      const user = makeUser({ id: 'owner' });
      const launch = makeLaunch({ status: 'APPROVED' });
      expect(canEditLaunch(user, launch, ['owner'])).toBe(false);
    });

    test('cannot edit LAUNCHED launch', () => {
      const user = makeUser({ id: 'owner' });
      const launch = makeLaunch({ status: 'LAUNCHED' });
      expect(canEditLaunch(user, launch, ['owner'])).toBe(false);
    });
  });

  describe('canSubmitForReview', () => {
    test('owner can submit DRAFT', () => {
      const user = makeUser({ id: 'owner' });
      const launch = makeLaunch({ status: 'DRAFT' });
      expect(canSubmitForReview(user, launch, ['owner'])).toBe(true);
    });

    test('cannot submit non-DRAFT', () => {
      const user = makeUser({ id: 'owner' });
      const launch = makeLaunch({ status: 'IN_REVIEW' });
      expect(canSubmitForReview(user, launch, ['owner'])).toBe(false);
    });
  });

  describe('canLaunchWithException', () => {
    test('admin can launch with exception from IN_REVIEW', () => {
      const admin = makeUser({ role: 'admin' });
      const launch = makeLaunch({ status: 'IN_REVIEW' });
      expect(canLaunchWithException(admin, launch)).toBe(true);
    });

    test('non-admin cannot launch with exception', () => {
      const user = makeUser({ role: 'member' });
      const launch = makeLaunch({ status: 'IN_REVIEW' });
      expect(canLaunchWithException(user, launch)).toBe(false);
    });

    test('admin cannot exception from DRAFT', () => {
      const admin = makeUser({ role: 'admin' });
      const launch = makeLaunch({ status: 'DRAFT' });
      expect(canLaunchWithException(admin, launch)).toBe(false);
    });
  });

  describe('canCancelLaunch', () => {
    test('owner can cancel DRAFT', () => {
      const user = makeUser({ id: 'owner' });
      const launch = makeLaunch({ status: 'DRAFT' });
      expect(canCancelLaunch(user, launch, ['owner'])).toBe(true);
    });

    test('cannot cancel already LAUNCHED', () => {
      const user = makeUser({ id: 'owner' });
      const launch = makeLaunch({ status: 'LAUNCHED' });
      expect(canCancelLaunch(user, launch, ['owner'])).toBe(false);
    });

    test('cannot cancel already CANCELLED', () => {
      const user = makeUser({ id: 'owner' });
      const launch = makeLaunch({ status: 'CANCELLED' });
      expect(canCancelLaunch(user, launch, ['owner'])).toBe(false);
    });
  });

  // ── Review Permissions ─────────────────────────────────────────────────────

  describe('canReview', () => {
    test('any org member can review by default', () => {
      const user = makeUser({ role: 'member' });
      const review = makeReview();
      expect(canReview(user, review, [])).toBe(true);
    });

    test('owner cannot self-approve when owner_approval_disallowed', () => {
      const owner = makeUser({ id: 'owner' });
      const review = makeReview({ owner_approval_disallowed: true });
      expect(canReview(owner, review, ['owner'])).toBe(false);
    });

    test('non-owner can still review when owner_approval_disallowed', () => {
      const reviewer = makeUser({ id: 'reviewer-1' });
      const review = makeReview({ owner_approval_disallowed: true });
      expect(canReview(reviewer, review, ['owner'])).toBe(true);
    });

    test('access_restricted blocks user when another reviewer is assigned', () => {
      const user = makeUser({ id: 'user-1' });
      const review = makeReview({
        access_restricted: true,
        reviewed_by: 'another-user',
      });
      expect(canReview(user, review, [])).toBe(false);
    });

    test('access_restricted allows the assigned reviewer', () => {
      const user = makeUser({ id: 'assigned-reviewer' });
      const review = makeReview({
        access_restricted: true,
        reviewed_by: 'assigned-reviewer',
      });
      expect(canReview(user, review, [])).toBe(true);
    });

    test('access_restricted with no assigned reviewer allows anyone', () => {
      const user = makeUser({ id: 'anyone' });
      const review = makeReview({
        access_restricted: true,
        reviewed_by: null,
      });
      expect(canReview(user, review, [])).toBe(true);
    });

    // ── reviewer_emails enforcement ───────────────────────────────────────────

    test('access_restricted + reviewer_emails allows listed user', () => {
      const user = makeUser({ email: 'alice@corp.com' });
      const review = makeReview({ access_restricted: true });
      expect(canReview(user, review, [], ['alice@corp.com', 'bob@corp.com'])).toBe(true);
    });

    test('access_restricted + reviewer_emails blocks unlisted user', () => {
      const user = makeUser({ email: 'eve@corp.com' });
      const review = makeReview({ access_restricted: true });
      expect(canReview(user, review, [], ['alice@corp.com', 'bob@corp.com'])).toBe(false);
    });

    test('reviewer_emails check is case-insensitive', () => {
      const user = makeUser({ email: 'Alice@Corp.COM' });
      const review = makeReview({ access_restricted: true });
      expect(canReview(user, review, [], ['alice@corp.com'])).toBe(true);
    });

    test('empty reviewer_emails allows anyone when access_restricted', () => {
      const user = makeUser({ email: 'anyone@corp.com' });
      const review = makeReview({ access_restricted: true });
      expect(canReview(user, review, [], [])).toBe(true);
    });

    test('reviewer_emails ignored when access_restricted is false', () => {
      const user = makeUser({ email: 'unlisted@corp.com' });
      const review = makeReview({ access_restricted: false });
      // Even though user is not in the email list, they can review because access is not restricted
      expect(canReview(user, review, [], ['alice@corp.com'])).toBe(true);
    });

    test('owner_approval_disallowed takes priority over reviewer_emails', () => {
      const owner = makeUser({ id: 'owner', email: 'owner@corp.com' });
      const review = makeReview({
        access_restricted: true,
        owner_approval_disallowed: true,
      });
      // Owner is in the email list but still blocked by owner_approval_disallowed
      expect(canReview(owner, review, ['owner'], ['owner@corp.com'])).toBe(false);
    });
  });

  describe('canDowngradeToFyi', () => {
    test('allowed when fyi_allowed is true', () => {
      const user = makeUser();
      const review = makeReview({ fyi_allowed: true });
      expect(canDowngradeToFyi(user, review, [])).toBe(true);
    });

    test('blocked when fyi_allowed is false', () => {
      const user = makeUser();
      const review = makeReview({ fyi_allowed: false });
      expect(canDowngradeToFyi(user, review, [])).toBe(false);
    });

    test('blocked when user cannot review (even if fyi_allowed)', () => {
      const owner = makeUser({ id: 'owner' });
      const review = makeReview({
        fyi_allowed: true,
        owner_approval_disallowed: true,
      });
      expect(canDowngradeToFyi(owner, review, ['owner'])).toBe(false);
    });
  });

  // ── Admin Permissions ──────────────────────────────────────────────────────

  describe('admin-only functions', () => {
    test('admin can manage settings', () => {
      expect(canManageSettings(makeUser({ role: 'admin' }))).toBe(true);
    });

    test('member cannot manage settings', () => {
      expect(canManageSettings(makeUser({ role: 'member' }))).toBe(false);
    });
  });
});
