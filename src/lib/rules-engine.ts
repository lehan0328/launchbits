// ============================================================================
// LAUNCHBITS — POLICY RULES ENGINE
// Derived from Prompt 2: Google's ConditionalLogicProto + ProcessConfigurableLogic
// Evaluates questionnaire answers → determines required review bits
// ============================================================================

import type { Launch, ReviewDefinition, ReviewStatus, ReviewType, RiskLevel } from './types';

// --- Rule Configuration Types ---

interface TriggerCondition {
  field: string;
  not_empty?: boolean;
  not_contains?: string;
  contains_any?: string[];
}

interface RiskOverride {
  default_status: ReviewStatus;
  fyi_allowed?: boolean;
  owner_approval_disallowed?: boolean;
  access_restricted?: boolean;
}

export interface PolicyRule {
  review_type: ReviewType;
  label: string;
  trigger_when: {
    always?: boolean;
    any_of?: TriggerCondition[];
  };
  trigger_reason: string;
  risk_overrides: Record<RiskLevel, RiskOverride>;
}

/** Result of evaluating a single rule */
export interface EvaluatedReview {
  definitionId: string;
  label: string;
  reviewType: ReviewType;
  defaultStatus: ReviewStatus;
  fyiAllowed: boolean;
  ownerApprovalDisallowed: boolean;
  accessRestricted: boolean;
  triggerReason: string;
  sloDays: number;
  slackChannel: string | null;
}

// --- Default Rules (hardcoded for MVP, YAML-configurable in v1.1) ---

/**
 * Default policy rules derived from Google's Ariane conditional logic.
 * See design doc §6.1 for the full YAML specification.
 */
export const DEFAULT_RULES: PolicyRule[] = [
  // Privacy Review (Google: PRIVACY / PDD)
  {
    review_type: 'PRIVACY',
    label: 'Privacy Review',
    trigger_when: {
      any_of: [
        { field: 'q_data_classes', not_empty: true, not_contains: 'DATA_NONE' },
      ],
    },
    trigger_reason: 'This launch processes user data (selected in Data Classification).',
    risk_overrides: {
      LOW: { default_status: 'FYI', fyi_allowed: true },
      MEDIUM: { default_status: 'PENDING_REVIEW', fyi_allowed: true },
      HIGH: {
        default_status: 'PENDING_REVIEW',
        fyi_allowed: false,
        owner_approval_disallowed: true,
        access_restricted: true,
      },
    },
  },

  // Security Review (Google: SPUR / ASA)
  {
    review_type: 'SECURITY',
    label: 'Security Review',
    trigger_when: {
      any_of: [
        { field: 'q_network_exposure', contains_any: ['NET_PUBLIC_API'] },
        { field: 'q_auth_secrets', contains_any: ['AUTH_CUSTOM_TOKEN', 'AUTH_KEYS'] },
        { field: 'q_input_parsing', contains_any: ['INPUT_UNTRUSTED_HTML', 'INPUT_FILE_UPLOAD'] },
      ],
    },
    trigger_reason: 'This launch exposes public APIs, handles credentials, or parses untrusted input.',
    risk_overrides: {
      LOW: { default_status: 'FYI' },
      MEDIUM: { default_status: 'PENDING_REVIEW' },
      HIGH: {
        default_status: 'PENDING_REVIEW',
        fyi_allowed: false,
        owner_approval_disallowed: true,
      },
    },
  },

  // Legal Review (Google: LEGAL / PCounsel)
  {
    review_type: 'LEGAL',
    label: 'Legal Review',
    trigger_when: {
      any_of: [
        { field: 'q_external_sharing', contains_any: ['SHARE_PARTNERS', 'SHARE_CROSS_BORDER'] },
        { field: 'q_processing_purpose', contains_any: ['PURP_ADS_MONETIZATION'] },
      ],
    },
    trigger_reason: 'This launch involves external data sharing, cross-border transfer, or monetization.',
    risk_overrides: {
      LOW: { default_status: 'NOT_REQUIRED' },
      MEDIUM: { default_status: 'PENDING_REVIEW' },
      HIGH: { default_status: 'PENDING_REVIEW', fyi_allowed: false },
    },
  },

  // Engineering Lead (Google: PA_LEAD — always required)
  {
    review_type: 'ENGINEERING_LEAD',
    label: 'Engineering Lead Approval',
    trigger_when: { always: true },
    trigger_reason: 'Engineering lead approval is required for all launches.',
    risk_overrides: {
      LOW: { default_status: 'FYI' },
      MEDIUM: { default_status: 'PENDING_REVIEW' },
      HIGH: { default_status: 'PENDING_REVIEW' },
    },
  },
];

// --- Trigger Evaluation ---

/**
 * Check if a single trigger condition is met.
 */
function evaluateCondition(
  launch: Partial<Launch>,
  condition: TriggerCondition
): boolean {
  const fieldValue = (launch as Record<string, unknown>)[condition.field];

  // Array field checks
  if (Array.isArray(fieldValue)) {
    if (condition.not_empty) {
      // Check that array is non-empty AND doesn't only contain the excluded value
      if (fieldValue.length === 0) return false;
      if (condition.not_contains) {
        return !fieldValue.every(v => v === condition.not_contains);
      }
      return true;
    }
    if (condition.contains_any) {
      return condition.contains_any.some(v => fieldValue.includes(v));
    }
    if (condition.not_contains) {
      return !fieldValue.includes(condition.not_contains);
    }
  }

  return false;
}

// --- Main Evaluator ---

/**
 * Evaluate which reviews are required for a launch card.
 *
 * Derived from Prompt 2 §8: evaluate_required_reviews() pseudocode.
 *
 * @param launch - The launch card with questionnaire answers
 * @param riskLevel - Pre-calculated risk level
 * @param reviewDefinitions - Available review definitions for the org
 * @param rules - Policy rules (default: DEFAULT_RULES)
 * @returns Array of reviews to create
 */
export function evaluateRequiredReviews(
  launch: Partial<Launch>,
  riskLevel: RiskLevel,
  reviewDefinitions: ReviewDefinition[],
  rules: PolicyRule[] = DEFAULT_RULES
): EvaluatedReview[] {
  const results: EvaluatedReview[] = [];

  for (const rule of rules) {
    // 1. Check trigger conditions
    let triggered = false;

    if (rule.trigger_when.always) {
      triggered = true;
    } else if (rule.trigger_when.any_of) {
      triggered = rule.trigger_when.any_of.some(condition =>
        evaluateCondition(launch, condition)
      );
    }

    if (!triggered) continue;

    // 2. Find the matching review definition
    const definition = reviewDefinitions.find(
      d => d.review_type === rule.review_type
    );
    if (!definition) continue;

    // 3. Apply risk-level overrides (Prompt 2 §5)
    const riskConfig = rule.risk_overrides[riskLevel];

    results.push({
      definitionId: definition.id,
      label: rule.label,
      reviewType: rule.review_type,
      defaultStatus: riskConfig.default_status,
      fyiAllowed: riskConfig.fyi_allowed ?? true,
      ownerApprovalDisallowed: riskConfig.owner_approval_disallowed ?? false,
      accessRestricted: riskConfig.access_restricted ?? false,
      triggerReason: rule.trigger_reason,
      sloDays: definition.slo_days,
      slackChannel: definition.reviewer_slack_channel,
    });
  }

  return results;
}

/**
 * Calculate SLO due date, accounting for business days.
 * Derived from Prompt 3 §5: SloConfig { days: 3, day_type: BUSINESS }.
 */
export function calculateSloDueDate(
  sloDays: number,
  businessDaysOnly: boolean = true,
  startDate: Date = new Date()
): Date {
  const due = new Date(startDate);
  let added = 0;

  while (added < sloDays) {
    due.setDate(due.getDate() + 1);
    const dayOfWeek = due.getDay();
    if (!businessDaysOnly || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
      added++;
    }
  }

  return due;
}
