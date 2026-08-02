import { describe, test, expect } from 'vitest';
import {
  evaluateRequiredReviews,
  calculateSloDueDate,
  DEFAULT_RULES,
} from '@/lib/rules-engine';
import type { Launch, ReviewDefinition } from '@/lib/types';

// ── Test Fixtures ────────────────────────────────────────────────────────────

const REVIEW_DEFINITIONS: ReviewDefinition[] = [
  {
    id: 'def-privacy',
    org_id: 'org-1',
    label: 'Privacy Review',
    review_type: 'PRIVACY',
    description: null,
    reviewer_slack_channel: '#privacy-reviews',
    reviewer_emails: [],
    slo_days: 3,
    slo_business_days_only: true,
    escalation_slack_channel: null,
    fyi_allowed: true,
    owner_approval_disallowed: false,
    access_restricted: false,
  },
  {
    id: 'def-security',
    org_id: 'org-1',
    label: 'Security Review',
    review_type: 'SECURITY',
    description: null,
    reviewer_slack_channel: '#security-reviews',
    reviewer_emails: [],
    slo_days: 5,
    slo_business_days_only: true,
    escalation_slack_channel: null,
    fyi_allowed: true,
    owner_approval_disallowed: false,
    access_restricted: false,
  },
  {
    id: 'def-legal',
    org_id: 'org-1',
    label: 'Legal Review',
    review_type: 'LEGAL',
    description: null,
    reviewer_slack_channel: null,
    reviewer_emails: [],
    slo_days: 5,
    slo_business_days_only: true,
    escalation_slack_channel: null,
    fyi_allowed: true,
    owner_approval_disallowed: false,
    access_restricted: false,
  },
  {
    id: 'def-eng-lead',
    org_id: 'org-1',
    label: 'Engineering Lead Approval',
    review_type: 'ENGINEERING_LEAD',
    description: null,
    reviewer_slack_channel: null,
    reviewer_emails: [],
    slo_days: 2,
    slo_business_days_only: true,
    escalation_slack_channel: null,
    fyi_allowed: true,
    owner_approval_disallowed: false,
    access_restricted: false,
  },
] as ReviewDefinition[];

// ── Tests ────────────────────────────────────────────────────────────────────

describe('rules-engine', () => {
  // ── Trigger Conditions ─────────────────────────────────────────────────────

  describe('trigger conditions', () => {
    test('no data selected → no privacy review triggered', () => {
      const results = evaluateRequiredReviews(
        { q_data_classes: ['DATA_NONE'] },
        'LOW',
        REVIEW_DEFINITIONS,
      );
      const privacyReview = results.find(r => r.reviewType === 'PRIVACY');
      expect(privacyReview).toBeUndefined();
    });

    test('user data selected → privacy review triggered', () => {
      const results = evaluateRequiredReviews(
        { q_data_classes: ['DATA_ACCOUNT_IDS'] },
        'MEDIUM',
        REVIEW_DEFINITIONS,
      );
      const privacyReview = results.find(r => r.reviewType === 'PRIVACY');
      expect(privacyReview).toBeDefined();
      expect(privacyReview!.label).toBe('Privacy Review');
    });

    test('public API → security review triggered', () => {
      const results = evaluateRequiredReviews(
        { q_network_exposure: ['NET_PUBLIC_API'] },
        'HIGH',
        REVIEW_DEFINITIONS,
      );
      const securityReview = results.find(r => r.reviewType === 'SECURITY');
      expect(securityReview).toBeDefined();
    });

    test('no public API or auth → no security review', () => {
      const results = evaluateRequiredReviews(
        { q_network_exposure: ['NET_INTERNAL_RPC'] },
        'LOW',
        REVIEW_DEFINITIONS,
      );
      const securityReview = results.find(r => r.reviewType === 'SECURITY');
      expect(securityReview).toBeUndefined();
    });

    test('external sharing → legal review triggered', () => {
      const results = evaluateRequiredReviews(
        { q_external_sharing: ['SHARE_PARTNERS'] },
        'MEDIUM',
        REVIEW_DEFINITIONS,
      );
      const legalReview = results.find(r => r.reviewType === 'LEGAL');
      expect(legalReview).toBeDefined();
    });

    test('engineering lead review always triggers', () => {
      const results = evaluateRequiredReviews(
        {},
        'LOW',
        REVIEW_DEFINITIONS,
      );
      const engReview = results.find(r => r.reviewType === 'ENGINEERING_LEAD');
      expect(engReview).toBeDefined();
    });
  });

  // ── Risk Overrides ─────────────────────────────────────────────────────────

  describe('risk-level overrides', () => {
    test('LOW risk privacy → FYI status', () => {
      const results = evaluateRequiredReviews(
        { q_data_classes: ['DATA_DEVICE_LOGS'] },
        'LOW',
        REVIEW_DEFINITIONS,
      );
      const privacy = results.find(r => r.reviewType === 'PRIVACY');
      expect(privacy?.defaultStatus).toBe('FYI');
      expect(privacy?.fyiAllowed).toBe(true);
    });

    test('MEDIUM risk privacy → PENDING_REVIEW', () => {
      const results = evaluateRequiredReviews(
        { q_data_classes: ['DATA_ACCOUNT_IDS'] },
        'MEDIUM',
        REVIEW_DEFINITIONS,
      );
      const privacy = results.find(r => r.reviewType === 'PRIVACY');
      expect(privacy?.defaultStatus).toBe('PENDING_REVIEW');
    });

    test('HIGH risk privacy → access_restricted + owner_approval_disallowed', () => {
      const results = evaluateRequiredReviews(
        { q_data_classes: ['DATA_FINANCIAL'] },
        'HIGH',
        REVIEW_DEFINITIONS,
      );
      const privacy = results.find(r => r.reviewType === 'PRIVACY');
      expect(privacy?.defaultStatus).toBe('PENDING_REVIEW');
      expect(privacy?.fyiAllowed).toBe(false);
      expect(privacy?.ownerApprovalDisallowed).toBe(true);
      expect(privacy?.accessRestricted).toBe(true);
    });

    test('LOW risk legal → NOT_REQUIRED', () => {
      const results = evaluateRequiredReviews(
        { q_external_sharing: ['SHARE_PARTNERS'] },
        'LOW',
        REVIEW_DEFINITIONS,
      );
      const legal = results.find(r => r.reviewType === 'LEGAL');
      expect(legal?.defaultStatus).toBe('NOT_REQUIRED');
    });
  });

  // ── Missing Definitions ────────────────────────────────────────────────────

  describe('edge cases', () => {
    test('triggered rule with no matching definition is skipped', () => {
      const results = evaluateRequiredReviews(
        { q_data_classes: ['DATA_FINANCIAL'] },
        'HIGH',
        [], // no definitions at all
      );
      expect(results).toHaveLength(0);
    });

    test('custom rules override defaults', () => {
      const customRules = [{
        review_type: 'PRIVACY' as const,
        label: 'Custom Privacy',
        trigger_when: { always: true },
        trigger_reason: 'Always required',
        risk_overrides: {
          LOW: { default_status: 'PENDING_REVIEW' as const },
          MEDIUM: { default_status: 'PENDING_REVIEW' as const },
          HIGH: { default_status: 'PENDING_REVIEW' as const },
        },
      }];
      const results = evaluateRequiredReviews(
        {},
        'LOW',
        REVIEW_DEFINITIONS,
        customRules,
      );
      const privacy = results.find(r => r.reviewType === 'PRIVACY');
      expect(privacy).toBeDefined();
      expect(privacy?.defaultStatus).toBe('PENDING_REVIEW');
    });
  });

  // ── SLO Due Date ───────────────────────────────────────────────────────────

  describe('calculateSloDueDate', () => {
    test('3 business days from Monday → Thursday', () => {
      const monday = new Date('2026-01-05T10:00:00Z'); // Monday
      const due = calculateSloDueDate(3, true, monday);
      expect(due.getDay()).toBe(4); // Thursday
    });

    test('3 business days from Thursday → next Tuesday (skips weekend)', () => {
      const thursday = new Date('2026-01-08T10:00:00Z'); // Thursday
      const due = calculateSloDueDate(3, true, thursday);
      expect(due.getDay()).toBe(2); // Tuesday
    });

    test('calendar days include weekends', () => {
      const friday = new Date('2026-01-09T10:00:00Z'); // Friday
      const due = calculateSloDueDate(2, false, friday);
      expect(due.getDay()).toBe(0); // Sunday
    });

    test('1 business day from Friday → Monday', () => {
      const friday = new Date('2026-01-09T10:00:00Z'); // Friday
      const due = calculateSloDueDate(1, true, friday);
      expect(due.getDay()).toBe(1); // Monday
    });
  });
});
