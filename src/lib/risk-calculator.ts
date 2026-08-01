// ============================================================================
// LAUNCHBITS — RISK LEVEL CALCULATOR
// Derived from Prompt 5 §3: Eldar pddservicescore.go risk mapping
// Uses max risk_weight from questionnaire answers to determine risk tier
// ============================================================================

import type { Launch, RiskLevel } from './types';

/**
 * Risk weights per questionnaire choice.
 * 0 = no risk, 1 = low, 2 = medium, 3 = high
 * Derived from Google's PDD risk scoring (Prompt 5 §7)
 */
const RISK_WEIGHTS: Record<string, number> = {
  // Data classification (Prompt 5 §1, Q1.3)
  DATA_NONE: 0,
  DATA_DEVICE_LOGS: 1,
  DATA_ACCOUNT_IDS: 2,
  DATA_CONTENT: 2,
  DATA_FINANCIAL: 3,
  DATA_BIOMETRICS: 3,
  DATA_GOV_ID: 3,

  // Target population (Prompt 5 §1, Q1.2)
  POP_INTERNAL: 0,
  POP_STANDARD: 1,
  POP_ANONYMOUS: 1,
  POP_ENTERPRISE: 2,
  POP_KIDS: 3,

  // Processing purpose (Prompt 5 §2, Q2.1)
  PURP_CORE_SERVICE: 1,
  PURP_SECURITY_ABUSE: 1,
  PURP_PERSONALIZATION: 2,
  PURP_ADS_MONETIZATION: 3,
  PURP_AI_ML_TRAINING: 3,

  // Consent (Prompt 5 §2, Q2.2)
  CONSENT_TOS: 1,
  CONSENT_EXPLICIT_DIALOG: 1,
  CONSENT_OPT_OUT: 2,

  // Retention (Prompt 5 §3, Q3.1)
  TTL_30_DAYS: 1,
  TTL_180_DAYS: 2,
  TTL_INDEFINITE: 3,

  // Deletion (Prompt 5 §3, Q3.2)
  DEL_SELF_SERVICE: 1,
  DEL_MANUAL_TICKET: 3,

  // External sharing (Prompt 5 §4, Q4.1)
  SHARE_NONE: 0,
  SHARE_PARTNERS: 3,
  SHARE_CROSS_BORDER: 3,

  // AI/ML scope (Prompt 5 §5, Q5.1)
  AI_ANONYMIZED: 1,
  AI_USER_FINETUNE: 2,
  AI_FOUNDATION: 3,

  // Network exposure (Prompt 5 §6, Q6.1)
  NET_INTERNAL_RPC: 1,
  NET_PUBLIC_API: 3,
  NET_CORS_CHANGE: 2,

  // Auth & secrets (Prompt 5 §6, Q6.2)
  AUTH_STANDARD: 1,
  AUTH_CUSTOM_TOKEN: 3,
  AUTH_KEYS: 3,

  // Input parsing (Prompt 5 §6, Q6.3)
  INPUT_TYPED_PROTO: 1,
  INPUT_UNTRUSTED_HTML: 3,
  INPUT_FILE_UPLOAD: 3,
};

/**
 * Calculate the risk level for a launch card based on questionnaire answers.
 *
 * Logic (from Prompt 5 §3):
 * - Collect all selected questionnaire choices
 * - Find the maximum risk weight across all selections
 * - Map: max <= 1 → LOW, max == 2 → MEDIUM, max >= 3 → HIGH
 * - Override: kids (POP_KIDS) or automated decisions → always HIGH
 */
export function calculateRiskLevel(
  launch: Partial<Pick<Launch,
    | 'q_data_classes' | 'q_target_population' | 'q_processing_purpose'
    | 'q_consent_mechanism' | 'q_retention_ttl' | 'q_deletion_controls'
    | 'q_external_sharing' | 'q_ai_model_scope' | 'q_automated_decisions'
    | 'q_network_exposure' | 'q_auth_secrets' | 'q_input_parsing'
  >>
): RiskLevel {
  // Collect all selections into a flat array
  const allSelections: string[] = [
    ...(launch.q_data_classes || []),
    ...(launch.q_target_population || []),
    ...(launch.q_processing_purpose || []),
    ...(launch.q_external_sharing || []),
    ...(launch.q_network_exposure || []),
    ...(launch.q_auth_secrets || []),
    ...(launch.q_input_parsing || []),
  ];

  // Add single-select values
  if (launch.q_consent_mechanism) allSelections.push(launch.q_consent_mechanism);
  if (launch.q_retention_ttl) allSelections.push(launch.q_retention_ttl);
  if (launch.q_deletion_controls) allSelections.push(launch.q_deletion_controls);
  if (launch.q_ai_model_scope) allSelections.push(launch.q_ai_model_scope);

  // Calculate max weight
  const maxWeight = Math.max(0, ...allSelections.map(s => RISK_WEIGHTS[s] ?? 0));

  // Hard overrides (Prompt 5 §3)
  // Kids always HIGH
  if (launch.q_target_population?.includes('POP_KIDS')) return 'HIGH';
  // Automated legal/significant decisions always HIGH (Prompt 5 §5, Q5.2)
  if (launch.q_automated_decisions) return 'HIGH';

  // Map weight to tier
  if (maxWeight >= 3) return 'HIGH';
  if (maxWeight >= 2) return 'MEDIUM';
  return 'LOW';
}
