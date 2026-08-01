// ============================================================================
// LAUNCHBITS — IN-MEMORY DATA STORE (MVP)
// Simulates Supabase/PostgreSQL for local development
// Replace with Supabase client when deploying
// ============================================================================

import type {
  Organization, User, Launch, LaunchReview,
  LaunchEvent, ReviewDefinition, LaunchStatus,
  ReviewStatus, RiskLevel, ReviewWithLaunch,
} from './types';

// --- Demo Organization ---
const DEMO_ORG: Organization = {
  id: 'org-001',
  name: 'Acme Corp',
  slug: 'acme',
  policy_rules: '',
  created_at: new Date().toISOString(),
};

// --- Demo Users ---
const DEMO_USERS: User[] = [
  { id: 'user-001', org_id: 'org-001', email: 'alice@acme.com', display_name: 'Alice Chen', slack_user_id: null, avatar_url: null, role: 'admin' },
  { id: 'user-002', org_id: 'org-001', email: 'bob@acme.com', display_name: 'Bob Martinez', slack_user_id: null, avatar_url: null, role: 'reviewer' },
  { id: 'user-003', org_id: 'org-001', email: 'carol@acme.com', display_name: 'Carol Wang', slack_user_id: null, avatar_url: null, role: 'reviewer' },
  { id: 'user-004', org_id: 'org-001', email: 'dave@acme.com', display_name: 'Dave Kim', slack_user_id: null, avatar_url: null, role: 'member' },
];

// --- Default Review Definitions (seeded per org) ---
const DEMO_REVIEW_DEFINITIONS: ReviewDefinition[] = [
  {
    id: 'rd-privacy', org_id: 'org-001', label: 'Privacy Review', review_type: 'PRIVACY',
    description: 'Reviews data collection, retention, and sharing practices.',
    reviewer_slack_channel: '#privacy-reviews', reviewer_emails: ['bob@acme.com'],
    slo_days: 3, slo_business_days_only: true, escalation_slack_channel: '#privacy-leads',
    fyi_allowed: true, owner_approval_disallowed: false, access_restricted: false,
  },
  {
    id: 'rd-security', org_id: 'org-001', label: 'Security Review', review_type: 'SECURITY',
    description: 'Reviews network exposure, authentication, and input handling.',
    reviewer_slack_channel: '#security-reviews', reviewer_emails: ['carol@acme.com'],
    slo_days: 3, slo_business_days_only: true, escalation_slack_channel: '#security-leads',
    fyi_allowed: true, owner_approval_disallowed: false, access_restricted: false,
  },
  {
    id: 'rd-legal', org_id: 'org-001', label: 'Legal Review', review_type: 'LEGAL',
    description: 'Reviews external sharing, cross-border transfers, and monetization.',
    reviewer_slack_channel: '#legal-reviews', reviewer_emails: [],
    slo_days: 5, slo_business_days_only: true, escalation_slack_channel: '#legal-leads',
    fyi_allowed: true, owner_approval_disallowed: false, access_restricted: true,
  },
  {
    id: 'rd-eng-lead', org_id: 'org-001', label: 'Engineering Lead Approval', review_type: 'ENGINEERING_LEAD',
    description: 'Engineering lead sign-off on launch readiness.',
    reviewer_slack_channel: '#eng-leads', reviewer_emails: ['alice@acme.com'],
    slo_days: 2, slo_business_days_only: true, escalation_slack_channel: null,
    fyi_allowed: true, owner_approval_disallowed: false, access_restricted: false,
  },
];

// --- Demo Launches with Reviews ---
const DEMO_LAUNCHES: Launch[] = [
  {
    id: 'launch-001', org_id: 'org-001', display_id: 104,
    name: 'AI Product Recommendations',
    description: 'ML-powered product recommendation engine for the marketplace.',
    status: 'IN_REVIEW' as LaunchStatus, risk_level: 'MEDIUM' as RiskLevel, version: 2,
    target_date: '2026-09-15', hard_deadline: false,
    q_data_classes: ['DATA_ACCOUNT_IDS', 'DATA_CONTENT'],
    q_target_population: ['POP_STANDARD'],
    q_processing_purpose: ['PURP_CORE_SERVICE', 'PURP_PERSONALIZATION'],
    q_consent_mechanism: 'CONSENT_TOS', q_retention_ttl: 'TTL_180_DAYS',
    q_deletion_controls: 'DEL_SELF_SERVICE', q_external_sharing: ['SHARE_NONE'],
    q_ai_model_scope: null, q_automated_decisions: false,
    q_network_exposure: ['NET_PUBLIC_API'],
    q_auth_secrets: ['AUTH_STANDARD'], q_input_parsing: ['INPUT_TYPED_PROTO'],
    launch_justification: null,
    created_by: 'user-001', created_at: '2026-07-28T10:00:00Z',
    updated_at: '2026-07-30T14:00:00Z',
    github_repo: 'acme/marketplace', github_pr_number: 482,
  },
  {
    id: 'launch-002', org_id: 'org-001', display_id: 103,
    name: 'Billing Dashboard Redesign',
    description: 'Modernized billing interface with improved invoice management.',
    status: 'APPROVED' as LaunchStatus, risk_level: 'LOW' as RiskLevel, version: 3,
    target_date: '2026-08-20', hard_deadline: true,
    q_data_classes: ['DATA_DEVICE_LOGS'],
    q_target_population: ['POP_STANDARD'],
    q_processing_purpose: ['PURP_CORE_SERVICE'],
    q_consent_mechanism: 'CONSENT_TOS', q_retention_ttl: 'TTL_30_DAYS',
    q_deletion_controls: 'DEL_SELF_SERVICE', q_external_sharing: ['SHARE_NONE'],
    q_ai_model_scope: null, q_automated_decisions: false,
    q_network_exposure: ['NET_INTERNAL_RPC'],
    q_auth_secrets: ['AUTH_STANDARD'], q_input_parsing: ['INPUT_TYPED_PROTO'],
    launch_justification: null,
    created_by: 'user-004', created_at: '2026-07-20T08:00:00Z',
    updated_at: '2026-07-25T16:00:00Z',
    github_repo: 'acme/billing', github_pr_number: 211,
  },
  {
    id: 'launch-003', org_id: 'org-001', display_id: 102,
    name: 'Emergency: Payment Timeout Fix',
    description: 'Critical fix for payment processing timeout in high-traffic scenarios.',
    status: 'LAUNCHED_WITH_EXCEPTION' as LaunchStatus, risk_level: 'HIGH' as RiskLevel, version: 4,
    target_date: '2026-07-26', hard_deadline: true,
    q_data_classes: ['DATA_FINANCIAL'],
    q_target_population: ['POP_STANDARD'],
    q_processing_purpose: ['PURP_CORE_SERVICE'],
    q_consent_mechanism: 'CONSENT_TOS', q_retention_ttl: 'TTL_180_DAYS',
    q_deletion_controls: 'DEL_SELF_SERVICE', q_external_sharing: ['SHARE_NONE'],
    q_ai_model_scope: null, q_automated_decisions: false,
    q_network_exposure: ['NET_PUBLIC_API'],
    q_auth_secrets: ['AUTH_KEYS'], q_input_parsing: ['INPUT_TYPED_PROTO'],
    launch_justification: 'P0 billing outage affecting 15% of checkout traffic. Security review scheduled for post-launch completion by Aug 10. Tracked in JIRA-4521.',
    created_by: 'user-001', created_at: '2026-07-25T22:00:00Z',
    updated_at: '2026-07-26T01:30:00Z',
    github_repo: 'acme/payments', github_pr_number: 891,
  },
  {
    id: 'launch-004', org_id: 'org-001', display_id: 101,
    name: 'User Data Export API',
    description: 'GDPR-compliant data export endpoint for enterprise customers.',
    status: 'DRAFT' as LaunchStatus, risk_level: 'HIGH' as RiskLevel, version: 1,
    target_date: '2026-10-01', hard_deadline: false,
    q_data_classes: ['DATA_ACCOUNT_IDS', 'DATA_CONTENT', 'DATA_FINANCIAL'],
    q_target_population: ['POP_ENTERPRISE'],
    q_processing_purpose: ['PURP_CORE_SERVICE'],
    q_consent_mechanism: null, q_retention_ttl: null,
    q_deletion_controls: null, q_external_sharing: ['SHARE_CROSS_BORDER'],
    q_ai_model_scope: null, q_automated_decisions: false,
    q_network_exposure: ['NET_PUBLIC_API'],
    q_auth_secrets: ['AUTH_CUSTOM_TOKEN'], q_input_parsing: ['INPUT_FILE_UPLOAD'],
    launch_justification: null,
    created_by: 'user-004', created_at: '2026-07-31T06:00:00Z',
    updated_at: '2026-07-31T06:00:00Z',
    github_repo: null, github_pr_number: null,
  },
];

const DEMO_REVIEWS: LaunchReview[] = [
  // Launch 104 reviews
  {
    id: 'rev-001', launch_id: 'launch-001', review_definition_id: 'rd-privacy',
    status: 'APPROVED' as ReviewStatus, notes: 'Standard data handling. LGTM.',
    reviewed_by: 'user-002', reviewed_by_name: 'Bob Martinez',
    reviewed_at: '2026-07-30T14:15:00Z',
    slo_started_at: '2026-07-28T10:00:00Z', slo_due_at: '2026-07-31T10:00:00Z',
    slo_breached: false,
    trigger_reason: 'This launch processes user data (Account IDs, User Content).',
    fyi_allowed: true, owner_approval_disallowed: false, access_restricted: false,
    label: 'Privacy Review', review_type: 'PRIVACY',
  },
  {
    id: 'rev-002', launch_id: 'launch-001', review_definition_id: 'rd-security',
    status: 'PENDING_REVIEW' as ReviewStatus, notes: null,
    reviewed_by: null, reviewed_by_name: null, reviewed_at: null,
    slo_started_at: '2026-07-28T10:00:00Z', slo_due_at: '2026-08-01T10:00:00Z',
    slo_breached: false,
    trigger_reason: 'This launch exposes a new public HTTPS API endpoint.',
    fyi_allowed: true, owner_approval_disallowed: false, access_restricted: false,
    label: 'Security Review', review_type: 'SECURITY',
  },
  {
    id: 'rev-003', launch_id: 'launch-001', review_definition_id: 'rd-eng-lead',
    status: 'PENDING_REVIEW' as ReviewStatus, notes: null,
    reviewed_by: null, reviewed_by_name: null, reviewed_at: null,
    slo_started_at: '2026-07-28T10:05:00Z', slo_due_at: '2026-07-31T10:05:00Z', slo_breached: false,
    trigger_reason: 'Engineering lead approval is required for all launches.',
    fyi_allowed: true, owner_approval_disallowed: false, access_restricted: false,
    label: 'Engineering Lead Approval', review_type: 'ENGINEERING_LEAD',
  },
  // Launch 103 reviews
  {
    id: 'rev-004', launch_id: 'launch-002', review_definition_id: 'rd-privacy',
    status: 'FYI' as ReviewStatus, notes: null,
    reviewed_by: null, reviewed_by_name: null, reviewed_at: null,
    slo_started_at: null, slo_due_at: null, slo_breached: false,
    trigger_reason: 'This launch processes device logs (LOW risk → FYI).',
    fyi_allowed: true, owner_approval_disallowed: false, access_restricted: false,
    label: 'Privacy Review', review_type: 'PRIVACY',
  },
  {
    id: 'rev-005', launch_id: 'launch-002', review_definition_id: 'rd-eng-lead',
    status: 'APPROVED' as ReviewStatus, notes: 'Ship it!',
    reviewed_by: 'user-001', reviewed_by_name: 'Alice Chen',
    reviewed_at: '2026-07-24T11:00:00Z',
    slo_started_at: '2026-07-20T08:00:00Z', slo_due_at: '2026-07-22T08:00:00Z',
    slo_breached: false,
    trigger_reason: 'Engineering lead approval is required for all launches.',
    fyi_allowed: true, owner_approval_disallowed: false, access_restricted: false,
    label: 'Engineering Lead Approval', review_type: 'ENGINEERING_LEAD',
  },
  // Launch 102 reviews
  {
    id: 'rev-006', launch_id: 'launch-003', review_definition_id: 'rd-security',
    status: 'PENDING_REVIEW' as ReviewStatus, notes: null,
    reviewed_by: null, reviewed_by_name: null, reviewed_at: null,
    slo_started_at: '2026-07-25T22:00:00Z', slo_due_at: '2026-07-28T22:00:00Z',
    slo_breached: true,
    trigger_reason: 'This launch handles API keys and exposes a public endpoint.',
    fyi_allowed: false, owner_approval_disallowed: true, access_restricted: true,
    label: 'Security Review', review_type: 'SECURITY',
  },
  {
    id: 'rev-007', launch_id: 'launch-003', review_definition_id: 'rd-privacy',
    status: 'APPROVED' as ReviewStatus, notes: 'Financial data handling reviewed.',
    reviewed_by: 'user-002', reviewed_by_name: 'Bob Martinez',
    reviewed_at: '2026-07-26T00:30:00Z',
    slo_started_at: '2026-07-25T22:00:00Z', slo_due_at: '2026-07-28T22:00:00Z',
    slo_breached: false,
    trigger_reason: 'This launch processes financial/payment data.',
    fyi_allowed: false, owner_approval_disallowed: true, access_restricted: true,
    label: 'Privacy Review', review_type: 'PRIVACY',
  },
];

const DEMO_EVENTS: LaunchEvent[] = [
  { id: 'evt-001', launch_id: 'launch-001', launch_version: 1, event_type: 'LAUNCH_CREATED', performed_by: 'user-001', performed_by_name: 'Alice Chen', performed_at: '2026-07-28T10:00:00Z', field_changed: null, old_value: null, new_value: null, notes: null },
  { id: 'evt-002', launch_id: 'launch-001', launch_version: 1, event_type: 'SUBMITTED_FOR_REVIEW', performed_by: 'user-001', performed_by_name: 'Alice Chen', performed_at: '2026-07-28T10:05:00Z', field_changed: null, old_value: null, new_value: { reviews: ['Privacy Review', 'Security Review', 'Eng Lead (FYI)'] }, notes: null },
  { id: 'evt-003', launch_id: 'launch-001', launch_version: 2, event_type: 'REVIEW_APPROVED', performed_by: 'user-002', performed_by_name: 'Bob Martinez', performed_at: '2026-07-30T14:15:00Z', field_changed: 'review_status', old_value: { review: 'Privacy Review', status: 'PENDING_REVIEW' }, new_value: { review: 'Privacy Review', status: 'APPROVED' }, notes: 'Standard data handling. LGTM.' },
  { id: 'evt-004', launch_id: 'launch-003', launch_version: 3, event_type: 'LAUNCHED_WITH_EXCEPTION', performed_by: 'user-001', performed_by_name: 'Alice Chen', performed_at: '2026-07-26T01:30:00Z', field_changed: 'status', old_value: { status: 'IN_REVIEW' }, new_value: { status: 'LAUNCHED_WITH_EXCEPTION', pending_reviews: ['Security Review'] }, notes: 'P0 billing outage affecting 15% of checkout traffic.' },
];

// --- Store class ---

class Store {
  private launches = [...DEMO_LAUNCHES];
  private reviews = [...DEMO_REVIEWS];
  private events = [...DEMO_EVENTS];
  private users = [...DEMO_USERS];
  private reviewDefinitions = [...DEMO_REVIEW_DEFINITIONS];
  private org = DEMO_ORG;

  // --- Launches ---
  getLaunches(): Launch[] {
    return [...this.launches].sort((a, b) => b.display_id - a.display_id);
  }

  getLaunchById(id: string): Launch | undefined {
    return this.launches.find(l => l.id === id);
  }

  getLaunchByDisplayId(displayId: number): Launch | undefined {
    return this.launches.find(l => l.display_id === displayId);
  }

  createLaunch(data: Partial<Launch>): Launch {
    const maxDisplayId = Math.max(0, ...this.launches.map(l => l.display_id));
    const launch: Launch = {
      id: `launch-${Date.now()}`,
      org_id: this.org.id,
      display_id: maxDisplayId + 1,
      name: data.name || 'Untitled Launch',
      description: data.description || null,
      status: 'DRAFT',
      risk_level: data.risk_level || 'LOW',
      version: 1,
      target_date: data.target_date || null,
      hard_deadline: data.hard_deadline || false,
      q_data_classes: data.q_data_classes || [],
      q_target_population: data.q_target_population || [],
      q_processing_purpose: data.q_processing_purpose || [],
      q_consent_mechanism: data.q_consent_mechanism || null,
      q_retention_ttl: data.q_retention_ttl || null,
      q_deletion_controls: data.q_deletion_controls || null,
      q_external_sharing: data.q_external_sharing || [],
      q_ai_model_scope: data.q_ai_model_scope || null,
      q_automated_decisions: data.q_automated_decisions || false,
      q_network_exposure: data.q_network_exposure || [],
      q_auth_secrets: data.q_auth_secrets || [],
      q_input_parsing: data.q_input_parsing || [],
      launch_justification: null,
      created_by: data.created_by || 'user-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      github_repo: data.github_repo || null,
      github_pr_number: null,
    };
    this.launches.push(launch);
    this.addEvent(launch.id, 1, 'LAUNCH_CREATED', launch.created_by);
    return launch;
  }

  updateLaunch(id: string, updates: Partial<Launch>): Launch | null {
    const idx = this.launches.findIndex(l => l.id === id);
    if (idx === -1) return null;
    this.launches[idx] = { ...this.launches[idx], ...updates, updated_at: new Date().toISOString() };
    return this.launches[idx];
  }

  // --- Reviews ---
  getReviewsForLaunch(launchId: string): LaunchReview[] {
    return this.reviews.filter(r => r.launch_id === launchId);
  }

  getPendingReviewsForUser(userId: string): ReviewWithLaunch[] {
    // In MVP, any reviewer can review any pending bit
    // TODO: filter by reviewer_emails or slack channel membership
    const user = this.users.find(u => u.id === userId);
    if (!user || user.role === 'member') return [];
    return this.reviews
      .filter(r => ['PENDING_REVIEW', 'IN_PROGRESS'].includes(r.status))
      .map(r => ({ ...r, launch: this.getLaunchById(r.launch_id) }));
  }

  addReview(review: LaunchReview): void {
    this.reviews.push(review);
  }

  updateReview(id: string, updates: Partial<LaunchReview>): LaunchReview | null {
    const idx = this.reviews.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.reviews[idx] = { ...this.reviews[idx], ...updates };
    return this.reviews[idx];
  }

  getReviewById(id: string): LaunchReview | undefined {
    return this.reviews.find(r => r.id === id);
  }

  // --- Events ---
  getAllEvents(): LaunchEvent[] {
    return [...this.events]
      .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime());
  }

  getEventsForLaunch(launchId: string): LaunchEvent[] {
    return this.events
      .filter(e => e.launch_id === launchId)
      .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime());
  }

  addEvent(
    launchId: string,
    version: number,
    eventType: string,
    performedBy: string | null,
    details?: { field?: string; old?: unknown; new_val?: unknown; notes?: string }
  ): void {
    const user = this.users.find(u => u.id === performedBy);
    this.events.push({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      launch_id: launchId,
      launch_version: version,
      event_type: eventType,
      performed_by: performedBy,
      performed_by_name: user?.display_name || null,
      performed_at: new Date().toISOString(),
      field_changed: details?.field || null,
      old_value: details?.old || null,
      new_value: details?.new_val || null,
      notes: details?.notes || null,
    });
  }

  // --- Users ---
  getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  getCurrentUser(): User {
    return this.users[0]; // Alice (admin) for demo
  }

  // --- Review Definitions ---
  getReviewDefinitions(): ReviewDefinition[] {
    return this.reviewDefinitions;
  }

  getOrganization(): Organization {
    return this.org;
  }
}

// Singleton store
export const store = new Store();
