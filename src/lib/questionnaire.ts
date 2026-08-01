// ============================================================================
// LAUNCHBITS — QUESTIONNAIRE CONFIGURATION
// Derived from Prompt 5: Google's Eldar PDD + SPUR questionnaire
// Defines all questions, choices, conditional visibility, and risk weights
// ============================================================================

export interface QuestionChoice {
  id: string;
  label: string;
  description?: string;
  riskWeight: number;
}

export interface Question {
  id: string;
  fieldName: string;        // Maps to Launch column
  type: 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'BOOLEAN';
  prompt: string;
  helpText?: string;
  required: boolean;
  choices?: QuestionChoice[];
}

export interface QuestionnaireSection {
  id: string;
  title: string;
  icon: string;
  /** If set, section is only visible when this condition is met */
  visibleWhen?: {
    fieldName: string;
    condition: 'not_contains' | 'contains' | 'not_empty';
    value?: string;
  };
  questions: Question[];
}

export const QUESTIONNAIRE_SECTIONS: QuestionnaireSection[] = [
  // ── SECTION 1: OVERVIEW & SCOPE (Always visible) ──────────────
  {
    id: 'sec_overview',
    title: 'Overview & Scope',
    icon: '📋',
    questions: [
      {
        id: 'q1_2',
        fieldName: 'q_target_population',
        type: 'MULTI_SELECT',
        prompt: 'Target User Population',
        helpText: 'Select all user groups that will interact with this feature.',
        required: true,
        choices: [
          { id: 'POP_STANDARD', label: 'Standard Logged-in Users', riskWeight: 1 },
          { id: 'POP_ENTERPRISE', label: 'Enterprise / Workspace Tenants', riskWeight: 2 },
          { id: 'POP_KIDS', label: 'Kids / Under-18 Users (COPPA)', description: 'Triggers mandatory HIGH risk review', riskWeight: 3 },
          { id: 'POP_INTERNAL', label: 'Internal Employees Only', riskWeight: 0 },
          { id: 'POP_ANONYMOUS', label: 'Non-logged-in / Anonymous Users', riskWeight: 1 },
        ],
      },
      {
        id: 'q1_3',
        fieldName: 'q_data_classes',
        type: 'MULTI_SELECT',
        prompt: 'Data Classification',
        helpText: 'What categories of user data does this feature process?',
        required: true,
        choices: [
          { id: 'DATA_NONE', label: 'None — no user data', description: 'Selecting this hides privacy sections', riskWeight: 0 },
          { id: 'DATA_DEVICE_LOGS', label: 'Device & Usage Logs (IP, User-Agent)', riskWeight: 1 },
          { id: 'DATA_ACCOUNT_IDS', label: 'Account Identifiers (email, user ID)', riskWeight: 2 },
          { id: 'DATA_CONTENT', label: 'User-Generated Content (docs, photos, messages)', riskWeight: 2 },
          { id: 'DATA_FINANCIAL', label: 'Financial & Payment Information', description: 'Triggers HIGH risk', riskWeight: 3 },
          { id: 'DATA_BIOMETRICS', label: 'Biometric or Health Information', description: 'Triggers HIGH risk', riskWeight: 3 },
          { id: 'DATA_GOV_ID', label: 'Government Issued ID / Passport', description: 'Triggers HIGH risk', riskWeight: 3 },
        ],
      },
    ],
  },

  // ── SECTION 2: COLLECTION & PURPOSE (Visible if data != NONE) ──
  {
    id: 'sec_collection',
    title: 'Collection & Purpose',
    icon: '🔍',
    visibleWhen: {
      fieldName: 'q_data_classes',
      condition: 'not_contains',
      value: 'DATA_NONE',
    },
    questions: [
      {
        id: 'q2_1',
        fieldName: 'q_processing_purpose',
        type: 'MULTI_SELECT',
        prompt: 'Processing Purpose',
        helpText: 'Why is this data being collected or processed?',
        required: true,
        choices: [
          { id: 'PURP_CORE_SERVICE', label: 'Core Functional Delivery', riskWeight: 1 },
          { id: 'PURP_SECURITY_ABUSE', label: 'Security & Fraud Prevention', riskWeight: 1 },
          { id: 'PURP_PERSONALIZATION', label: 'Personalization & Recommendations', riskWeight: 2 },
          { id: 'PURP_ADS_MONETIZATION', label: 'Advertising or Monetization', description: 'Triggers legal review', riskWeight: 3 },
          { id: 'PURP_AI_ML_TRAINING', label: 'AI / ML Model Training', description: 'Reveals AI/ML section', riskWeight: 3 },
        ],
      },
      {
        id: 'q2_2',
        fieldName: 'q_consent_mechanism',
        type: 'SINGLE_SELECT',
        prompt: 'Consent & Notice Mechanism',
        required: true,
        choices: [
          { id: 'CONSENT_TOS', label: 'Covered by Terms of Service / Privacy Policy', riskWeight: 1 },
          { id: 'CONSENT_EXPLICIT_DIALOG', label: 'Explicit In-App Consent Dialog', riskWeight: 1 },
          { id: 'CONSENT_OPT_OUT', label: 'Enabled by Default with Opt-Out', riskWeight: 2 },
        ],
      },
    ],
  },

  // ── SECTION 3: RETENTION & DELETION ──────────────────────────
  {
    id: 'sec_retention',
    title: 'Retention & Deletion',
    icon: '🗓️',
    visibleWhen: {
      fieldName: 'q_data_classes',
      condition: 'not_contains',
      value: 'DATA_NONE',
    },
    questions: [
      {
        id: 'q3_1',
        fieldName: 'q_retention_ttl',
        type: 'SINGLE_SELECT',
        prompt: 'Retention TTL',
        helpText: 'How long is data retained before automatic deletion?',
        required: true,
        choices: [
          { id: 'TTL_30_DAYS', label: 'Short-Term (< 30 days)', riskWeight: 1 },
          { id: 'TTL_180_DAYS', label: 'Standard (< 180 days)', riskWeight: 2 },
          { id: 'TTL_INDEFINITE', label: 'Indefinite / Until Account Deletion', description: 'Triggers HIGH risk', riskWeight: 3 },
        ],
      },
      {
        id: 'q3_2',
        fieldName: 'q_deletion_controls',
        type: 'SINGLE_SELECT',
        prompt: 'User Deletion Controls',
        required: true,
        choices: [
          { id: 'DEL_SELF_SERVICE', label: 'Self-Service (user can delete their data)', riskWeight: 1 },
          { id: 'DEL_MANUAL_TICKET', label: 'Requires Support Ticket / Manual Process', description: 'Triggers HIGH risk', riskWeight: 3 },
        ],
      },
    ],
  },

  // ── SECTION 4: SHARING & TRUST BOUNDARIES ────────────────────
  {
    id: 'sec_sharing',
    title: 'Sharing & Trust Boundaries',
    icon: '🌐',
    visibleWhen: {
      fieldName: 'q_data_classes',
      condition: 'not_contains',
      value: 'DATA_NONE',
    },
    questions: [
      {
        id: 'q4_1',
        fieldName: 'q_external_sharing',
        type: 'MULTI_SELECT',
        prompt: 'External Sharing & Cross-Border Transfers',
        required: true,
        choices: [
          { id: 'SHARE_NONE', label: 'No External Sharing (internal only)', riskWeight: 0 },
          { id: 'SHARE_PARTNERS', label: 'Shared with External Partners', description: 'Triggers legal review', riskWeight: 3 },
          { id: 'SHARE_CROSS_BORDER', label: 'Cross-Border Transfer (US ↔ EU)', description: 'Triggers legal review', riskWeight: 3 },
        ],
      },
    ],
  },

  // ── SECTION 5: AI / ML GOVERNANCE (Visible if AI/ML selected) ─
  {
    id: 'sec_ai_ml',
    title: 'AI / ML Governance',
    icon: '🤖',
    visibleWhen: {
      fieldName: 'q_processing_purpose',
      condition: 'contains',
      value: 'PURP_AI_ML_TRAINING',
    },
    questions: [
      {
        id: 'q5_1',
        fieldName: 'q_ai_model_scope',
        type: 'SINGLE_SELECT',
        prompt: 'Model Scope & User Data Exposure',
        required: true,
        choices: [
          { id: 'AI_ANONYMIZED', label: 'Aggregated / Anonymized Data Only', riskWeight: 1 },
          { id: 'AI_USER_FINETUNE', label: 'Fine-Tunes User-Specific Models (isolated)', riskWeight: 2 },
          { id: 'AI_FOUNDATION', label: 'Trains Foundation Models on User Content', description: 'Triggers HIGH risk + DPIA', riskWeight: 3 },
        ],
      },
      {
        id: 'q5_2',
        fieldName: 'q_automated_decisions',
        type: 'BOOLEAN',
        prompt: 'Does this model make automated decisions with legal or significant effects on users?',
        helpText: 'e.g., credit decisions, content moderation, access controls. Triggers mandatory HIGH risk.',
        required: true,
      },
    ],
  },

  // ── SECTION 6: SECURITY ARCHITECTURE (Always visible) ────────
  {
    id: 'sec_security',
    title: 'Security Architecture',
    icon: '🔒',
    questions: [
      {
        id: 'q6_1',
        fieldName: 'q_network_exposure',
        type: 'MULTI_SELECT',
        prompt: 'Network & Endpoint Exposure',
        required: true,
        choices: [
          { id: 'NET_INTERNAL_RPC', label: 'Internal-Only Service (mTLS / VPN)', riskWeight: 1 },
          { id: 'NET_PUBLIC_API', label: 'New Public HTTPS API Endpoint', description: 'Triggers security review', riskWeight: 3 },
          { id: 'NET_CORS_CHANGE', label: 'Modifies CORS Headers / Origin Policy', riskWeight: 2 },
        ],
      },
      {
        id: 'q6_2',
        fieldName: 'q_auth_secrets',
        type: 'MULTI_SELECT',
        prompt: 'Authentication & Secrets',
        required: true,
        choices: [
          { id: 'AUTH_STANDARD', label: 'Standard OAuth / SSO', riskWeight: 1 },
          { id: 'AUTH_CUSTOM_TOKEN', label: 'Custom Session Tokens / Auth Logic', description: 'Triggers security review', riskWeight: 3 },
          { id: 'AUTH_KEYS', label: 'Stores API Keys or Crypto Keys', description: 'Triggers security review', riskWeight: 3 },
        ],
      },
      {
        id: 'q6_3',
        fieldName: 'q_input_parsing',
        type: 'MULTI_SELECT',
        prompt: 'Untrusted Input Parsing',
        required: true,
        choices: [
          { id: 'INPUT_TYPED_PROTO', label: 'Typed JSON / Protobuf via Authenticated API', riskWeight: 1 },
          { id: 'INPUT_UNTRUSTED_HTML', label: 'Parses User HTML / XML / URLs', description: 'Triggers security review', riskWeight: 3 },
          { id: 'INPUT_FILE_UPLOAD', label: 'User File Uploads / Binary Processing', description: 'Triggers security review', riskWeight: 3 },
        ],
      },
    ],
  },
];

/**
 * Check if a questionnaire section should be visible based on current form state.
 */
export function isSectionVisible(
  section: QuestionnaireSection,
  formData: { [key: string]: unknown }
): boolean {
  if (!section.visibleWhen) return true;

  const { fieldName, condition, value } = section.visibleWhen;
  const fieldValue = formData[fieldName];

  if (!Array.isArray(fieldValue)) {
    if (condition === 'not_empty') return !!fieldValue;
    return true;
  }

  switch (condition) {
    case 'not_contains':
      // Visible if the array doesn't contain the value OR is empty
      // Special case: if DATA_NONE is the ONLY selection, hide privacy sections
      if (value === 'DATA_NONE') {
        return fieldValue.length > 0 && !fieldValue.includes('DATA_NONE');
      }
      return !fieldValue.includes(value!);
    case 'contains':
      return fieldValue.includes(value!);
    case 'not_empty':
      return fieldValue.length > 0;
    default:
      return true;
  }
}
