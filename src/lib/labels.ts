// ============================================================================
// LAUNCHBITS — DISPLAY LABELS
// Centralized human-readable labels for all enum/type values.
// Extracted from inline definitions across page components.
// ============================================================================

/** Data classification labels (q_data_classes) */
export const DATA_LABELS: Record<string, string> = {
  DATA_NONE: 'None',
  DATA_DEVICE_LOGS: 'Device Logs',
  DATA_ACCOUNT_IDS: 'Account IDs',
  DATA_CONTENT: 'User Content',
  DATA_FINANCIAL: 'Financial',
  DATA_BIOMETRICS: 'Biometrics',
  DATA_GOV_ID: 'Gov ID',
};

/** Processing purpose labels (q_processing_purpose) */
export const PURPOSE_LABELS: Record<string, string> = {
  PURP_CORE_SERVICE: 'Core Service',
  PURP_SECURITY_ABUSE: 'Security',
  PURP_PERSONALIZATION: 'Personalization',
  PURP_ADS_MONETIZATION: 'Monetization',
  PURP_AI_ML_TRAINING: 'AI/ML Training',
};

/** Network exposure labels (q_network_exposure) */
export const NETWORK_LABELS: Record<string, string> = {
  NET_INTERNAL_RPC: 'Internal RPC',
  NET_PUBLIC_API: 'Public API',
  NET_CORS_CHANGE: 'CORS Change',
};

/** Auth & secrets labels (q_auth_secrets) */
export const AUTH_LABELS: Record<string, string> = {
  AUTH_STANDARD: 'Standard OAuth',
  AUTH_CUSTOM_TOKEN: 'Custom Tokens',
  AUTH_KEYS: 'API/Crypto Keys',
};

/** External sharing labels (q_external_sharing) */
export const SHARING_LABELS: Record<string, string> = {
  SHARE_NONE: 'None',
  SHARE_PARTNERS: 'Partners',
  SHARE_CROSS_BORDER: 'Cross-Border',
};

/**
 * Map an array of enum values to their display labels, joined by comma.
 * Returns '—' if the array is empty.
 */
export function mapLabels(values: string[], labels: Record<string, string>): string {
  return values.map(v => labels[v] || v).join(', ') || '—';
}
