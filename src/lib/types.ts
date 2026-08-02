// ============================================================================
// LAUNCHBITS — CORE TYPES
// Derived from google.corp.launch.v1.Launch proto definitions
// ============================================================================

// --- Enums (from Google's proto enums) ---

/** Google: LaunchStatus (Prompt 1 §2) */
export type LaunchStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'LAUNCHED'
  | 'LAUNCHED_WITH_EXCEPTION'
  | 'CANCELLED';

/** Google: ApprovalStatus (Prompt 1 §2) */
export type ReviewStatus =
  | 'NOT_REQUIRED'
  | 'FYI'
  | 'PENDING_REVIEW'
  | 'IN_PROGRESS'
  | 'NEEDS_WORK'
  | 'APPROVED'
  | 'DENIED';

/** Google: RiskLevel (Prompt 1 §2) */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/** Google: ApproverType (Prompt 2 §1) */
export type ReviewType =
  | 'PRIVACY'
  | 'SECURITY'
  | 'LEGAL'
  | 'ENGINEERING_LEAD'
  | 'CUSTOM';

// --- Questionnaire Choice IDs ---

export type DataClassification =
  | 'DATA_NONE'
  | 'DATA_DEVICE_LOGS'
  | 'DATA_ACCOUNT_IDS'
  | 'DATA_CONTENT'
  | 'DATA_FINANCIAL'
  | 'DATA_BIOMETRICS'
  | 'DATA_GOV_ID';

export type TargetPopulation =
  | 'POP_STANDARD'
  | 'POP_ENTERPRISE'
  | 'POP_KIDS'
  | 'POP_INTERNAL'
  | 'POP_ANONYMOUS';

export type ProcessingPurpose =
  | 'PURP_CORE_SERVICE'
  | 'PURP_SECURITY_ABUSE'
  | 'PURP_PERSONALIZATION'
  | 'PURP_ADS_MONETIZATION'
  | 'PURP_AI_ML_TRAINING';

export type ConsentMechanism =
  | 'CONSENT_TOS'
  | 'CONSENT_EXPLICIT_DIALOG'
  | 'CONSENT_OPT_OUT';

export type RetentionTTL =
  | 'TTL_30_DAYS'
  | 'TTL_180_DAYS'
  | 'TTL_INDEFINITE';

export type DeletionControls =
  | 'DEL_SELF_SERVICE'
  | 'DEL_MANUAL_TICKET';

export type ExternalSharing =
  | 'SHARE_NONE'
  | 'SHARE_PARTNERS'
  | 'SHARE_CROSS_BORDER';

export type AIModelScope =
  | 'AI_ANONYMIZED'
  | 'AI_USER_FINETUNE'
  | 'AI_FOUNDATION';

export type NetworkExposure =
  | 'NET_INTERNAL_RPC'
  | 'NET_PUBLIC_API'
  | 'NET_CORS_CHANGE';

export type AuthSecrets =
  | 'AUTH_STANDARD'
  | 'AUTH_CUSTOM_TOKEN'
  | 'AUTH_KEYS';

export type InputParsing =
  | 'INPUT_TYPED_PROTO'
  | 'INPUT_UNTRUSTED_HTML'
  | 'INPUT_FILE_UPLOAD';

// --- Domain Models ---

export interface Organization {
  id: string;
  name: string;
  slug: string;
  policy_rules: string; // YAML
  slack_bot_token_encrypted: string | null;
  slack_team_id: string | null;
  github_app_installation_id: number | null;
  created_at: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  display_name: string;
  slack_user_id: string | null;
  avatar_url: string | null;
  role: 'member' | 'reviewer' | 'admin';
}

/** Google: Launch proto (Prompt 1 §1) — simplified */
export interface Launch {
  id: string;
  org_id: string;
  display_id: number;
  name: string;
  description: string | null;
  status: LaunchStatus;
  risk_level: RiskLevel;
  target_date: string | null;
  hard_deadline: boolean;

  // Questionnaire answers (Google: repeated Attribute)
  q_data_classes: DataClassification[];
  q_target_population: TargetPopulation[];
  q_processing_purpose: ProcessingPurpose[];
  q_consent_mechanism: ConsentMechanism | null;
  q_retention_ttl: RetentionTTL | null;
  q_deletion_controls: DeletionControls | null;
  q_external_sharing: ExternalSharing[];
  q_ai_model_scope: AIModelScope | null;
  q_automated_decisions: boolean;
  q_network_exposure: NetworkExposure[];
  q_auth_secrets: AuthSecrets[];
  q_input_parsing: InputParsing[];

  // Exception (Google: launch_justification)
  launch_justification: string | null;

  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;

  // GitHub
  github_repo: string | null;
  github_pr_number: number | null;
}

/** Google: ApproverDefinition (Prompt 2 §1) */
export interface ReviewDefinition {
  id: string;
  org_id: string;
  label: string;
  review_type: ReviewType;
  description: string | null;
  reviewer_slack_channel: string | null;
  reviewer_emails: string[];
  slo_days: number;
  slo_business_days_only: boolean;
  escalation_slack_channel: string | null;
  fyi_allowed: boolean;
  owner_approval_disallowed: boolean;
  access_restricted: boolean;
}

/** Google: ApproverData (Prompt 1 §3) */
export interface LaunchReview {
  id: string;
  launch_id: string;
  review_definition_id: string;
  status: ReviewStatus;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  slo_started_at: string | null;
  slo_due_at: string | null;
  slo_breached: boolean;
  trigger_reason: string | null;
  fyi_allowed: boolean;
  owner_approval_disallowed: boolean;
  access_restricted: boolean;
  // Joined from review_definitions for display
  label?: string;
  review_type?: ReviewType;
  reviewer_slack_channel?: string;
  reviewer_emails?: string[];
}

/** Google: LaunchEvents (Prompt 1 §5) */
export interface LaunchEvent {
  id: string;
  launch_id: string;
  launch_version: number;
  event_type: string;
  performed_by: string | null;
  performed_by_name: string | null;
  performed_at: string;
  field_changed: string | null;
  old_value: unknown;
  new_value: unknown;
  notes: string | null;
}

// --- Derived Types (used by UI components) ---

/** LaunchReview with the parent Launch joined for display in tables */
export interface ReviewWithLaunch extends LaunchReview {
  launch?: Launch;
}

/** Tracks Slack messages for updates (e.g., approval updates the review request message) */
export interface SlackMessage {
  id: string;
  org_id: string;
  launch_id: string;
  review_id: string | null;
  channel_id: string;
  message_ts: string;
  message_type: 'review_request' | 'approval' | 'denial' | 'slo_warning';
  created_at: string;
}

/**
 * Form state for the "Create Launch" page.
 * Explicitly typed to avoid `[key: string]: unknown` index signatures.
 */
export interface LaunchFormData {
  name: string;
  description: string;
  target_date: string;
  hard_deadline: boolean;
  github_repo: string;
  q_data_classes: DataClassification[];
  q_target_population: TargetPopulation[];
  q_processing_purpose: ProcessingPurpose[];
  q_consent_mechanism: ConsentMechanism | null;
  q_retention_ttl: RetentionTTL | null;
  q_deletion_controls: DeletionControls | null;
  q_external_sharing: ExternalSharing[];
  q_ai_model_scope: AIModelScope | null;
  q_automated_decisions: boolean;
  q_network_exposure: NetworkExposure[];
  q_auth_secrets: AuthSecrets[];
  q_input_parsing: InputParsing[];
}
