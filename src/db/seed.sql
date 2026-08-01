-- ============================================================================
-- LAUNCHBITS SEED DATA
-- Run this AFTER schema.sql to populate demo data for development.
-- Mirrors the data from the original in-memory store.ts.
-- ============================================================================

-- Demo Organization
INSERT INTO organizations (id, name, slug) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Acme Corp', 'acme');

-- Demo Users (password-based users are created via Supabase Auth separately)
-- These are app-level user profiles. Link to Supabase Auth via email match.
INSERT INTO users (id, org_id, email, display_name, role) VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'alice@acme.com', 'Alice Chen', 'admin'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'bob@acme.com', 'Bob Martinez', 'reviewer'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'carol@acme.com', 'Carol Wang', 'reviewer'),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 'dave@acme.com', 'Dave Kim', 'member');

-- Review Definitions (org-level templates)
INSERT INTO review_definitions (id, org_id, label, review_type, description, reviewer_slack_channel, reviewer_emails, slo_days, slo_business_days_only, escalation_slack_channel, fyi_allowed, owner_approval_disallowed, access_restricted) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Privacy Review', 'PRIVACY', 'Reviews data collection, retention, and sharing practices.', '#privacy-reviews', ARRAY['bob@acme.com'], 3, true, '#privacy-leads', true, false, false),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'Security Review', 'SECURITY', 'Reviews network exposure, authentication, and input handling.', '#security-reviews', ARRAY['carol@acme.com'], 3, true, '#security-leads', true, false, false),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', 'Legal Review', 'LEGAL', 'Reviews external sharing, cross-border transfers, and monetization.', '#legal-reviews', ARRAY[]::text[], 5, true, '#legal-leads', true, false, true),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', 'Engineering Lead Approval', 'ENGINEERING_LEAD', 'Engineering lead sign-off on launch readiness.', '#eng-leads', ARRAY['alice@acme.com'], 2, true, NULL, true, false, false);

-- Demo Launches
INSERT INTO launches (id, org_id, display_id, name, description, status, risk_level, version, target_date, hard_deadline,
  q_data_classes, q_target_population, q_processing_purpose, q_consent_mechanism, q_retention_ttl, q_deletion_controls, q_external_sharing, q_ai_model_scope, q_automated_decisions,
  q_network_exposure, q_auth_secrets, q_input_parsing, launch_justification, created_by, created_at, updated_at, github_repo, github_pr_number) VALUES

  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', 104,
   'AI Product Recommendations', 'ML-powered product recommendation engine for the marketplace.',
   'IN_REVIEW', 'MEDIUM', 2, '2026-09-15', false,
   ARRAY['DATA_ACCOUNT_IDS','DATA_CONTENT'], ARRAY['POP_STANDARD'], ARRAY['PURP_CORE_SERVICE','PURP_PERSONALIZATION'],
   'CONSENT_TOS', 'TTL_180_DAYS', 'DEL_SELF_SERVICE', ARRAY['SHARE_NONE'], NULL, false,
   ARRAY['NET_PUBLIC_API'], ARRAY['AUTH_STANDARD'], ARRAY['INPUT_TYPED_PROTO'],
   NULL, '00000000-0000-0000-0000-000000000101', '2026-07-28T10:00:00Z', '2026-07-30T14:00:00Z',
   'acme/marketplace', 482),

  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000001', 103,
   'Billing Dashboard Redesign', 'Modernized billing interface with improved invoice management.',
   'APPROVED', 'LOW', 3, '2026-08-20', true,
   ARRAY['DATA_DEVICE_LOGS'], ARRAY['POP_STANDARD'], ARRAY['PURP_CORE_SERVICE'],
   'CONSENT_TOS', 'TTL_30_DAYS', 'DEL_SELF_SERVICE', ARRAY['SHARE_NONE'], NULL, false,
   ARRAY['NET_INTERNAL_RPC'], ARRAY['AUTH_STANDARD'], ARRAY['INPUT_TYPED_PROTO'],
   NULL, '00000000-0000-0000-0000-000000000104', '2026-07-20T08:00:00Z', '2026-07-25T16:00:00Z',
   'acme/billing', 211),

  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000001', 102,
   'Emergency: Payment Timeout Fix', 'Critical fix for payment processing timeout in high-traffic scenarios.',
   'LAUNCHED_WITH_EXCEPTION', 'HIGH', 4, '2026-07-26', true,
   ARRAY['DATA_FINANCIAL'], ARRAY['POP_STANDARD'], ARRAY['PURP_CORE_SERVICE'],
   'CONSENT_TOS', 'TTL_180_DAYS', 'DEL_SELF_SERVICE', ARRAY['SHARE_NONE'], NULL, false,
   ARRAY['NET_PUBLIC_API'], ARRAY['AUTH_KEYS'], ARRAY['INPUT_TYPED_PROTO'],
   'P0 billing outage affecting 15% of checkout traffic. Security review scheduled for post-launch completion by Aug 10. Tracked in JIRA-4521.',
   '00000000-0000-0000-0000-000000000101', '2026-07-25T22:00:00Z', '2026-07-26T01:30:00Z',
   'acme/payments', 891),

  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000001', 101,
   'User Data Export API', 'GDPR-compliant data export endpoint for enterprise customers.',
   'DRAFT', 'HIGH', 1, '2026-10-01', false,
   ARRAY['DATA_ACCOUNT_IDS','DATA_CONTENT','DATA_FINANCIAL'], ARRAY['POP_ENTERPRISE'], ARRAY['PURP_CORE_SERVICE'],
   NULL, NULL, NULL, ARRAY['SHARE_CROSS_BORDER'], NULL, false,
   ARRAY['NET_PUBLIC_API'], ARRAY['AUTH_CUSTOM_TOKEN'], ARRAY['INPUT_FILE_UPLOAD'],
   NULL, '00000000-0000-0000-0000-000000000104', '2026-07-31T06:00:00Z', '2026-07-31T06:00:00Z',
   NULL, NULL);

-- Launch Owners
INSERT INTO launch_owners (launch_id, user_id, is_primary) VALUES
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', true),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000104', true),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000101', true),
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000104', true);

-- Demo Reviews
INSERT INTO launch_reviews (id, launch_id, review_definition_id, status, notes, reviewed_by, reviewed_by_name, reviewed_at, slo_started_at, slo_due_at, slo_breached, trigger_reason, fyi_allowed, owner_approval_disallowed, access_restricted) VALUES
  -- Launch 104 (AI Product Recommendations)
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201',
   'APPROVED', 'Standard data handling. LGTM.', '00000000-0000-0000-0000-000000000102', 'Bob Martinez', '2026-07-30T14:15:00Z',
   '2026-07-28T10:00:00Z', '2026-07-31T10:00:00Z', false, 'This launch processes user data (Account IDs, User Content).', true, false, false),

  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000202',
   'PENDING_REVIEW', NULL, NULL, NULL, NULL,
   '2026-07-28T10:00:00Z', '2026-08-01T10:00:00Z', false, 'This launch exposes a new public HTTPS API endpoint.', true, false, false),

  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000204',
   'PENDING_REVIEW', NULL, NULL, NULL, NULL,
   '2026-07-28T10:05:00Z', '2026-07-31T10:05:00Z', false, 'Engineering lead approval is required for all launches.', true, false, false),

  -- Launch 103 (Billing Dashboard)
  ('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000201',
   'FYI', NULL, NULL, NULL, NULL,
   NULL, NULL, false, 'This launch processes device logs (LOW risk → FYI).', true, false, false),

  ('00000000-0000-0000-0000-000000000405', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000204',
   'APPROVED', 'Ship it!', '00000000-0000-0000-0000-000000000101', 'Alice Chen', '2026-07-24T11:00:00Z',
   '2026-07-20T08:00:00Z', '2026-07-22T08:00:00Z', false, 'Engineering lead approval is required for all launches.', true, false, false),

  -- Launch 102 (Emergency Payment Fix)
  ('00000000-0000-0000-0000-000000000406', '00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000202',
   'PENDING_REVIEW', NULL, NULL, NULL, NULL,
   '2026-07-25T22:00:00Z', '2026-07-28T22:00:00Z', true, 'This launch handles API keys and exposes a public endpoint.', false, true, true),

  ('00000000-0000-0000-0000-000000000407', '00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000201',
   'APPROVED', 'Financial data handling reviewed.', '00000000-0000-0000-0000-000000000102', 'Bob Martinez', '2026-07-26T00:30:00Z',
   '2026-07-25T22:00:00Z', '2026-07-28T22:00:00Z', false, 'This launch processes financial/payment data.', false, true, true);

-- Demo Events (Audit Trail)
INSERT INTO launch_events (id, launch_id, launch_version, event_type, performed_by, performed_by_name, performed_at, field_changed, old_value, new_value, notes) VALUES
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000301', 1, 'LAUNCH_CREATED',
   '00000000-0000-0000-0000-000000000101', 'Alice Chen', '2026-07-28T10:00:00Z', NULL, NULL, NULL, NULL),

  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000301', 1, 'SUBMITTED_FOR_REVIEW',
   '00000000-0000-0000-0000-000000000101', 'Alice Chen', '2026-07-28T10:05:00Z', NULL, NULL,
   '{"reviews": ["Privacy Review", "Security Review", "Eng Lead (FYI)"]}'::jsonb, NULL),

  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000301', 2, 'REVIEW_APPROVED',
   '00000000-0000-0000-0000-000000000102', 'Bob Martinez', '2026-07-30T14:15:00Z', 'review_status',
   '{"review": "Privacy Review", "status": "PENDING_REVIEW"}'::jsonb,
   '{"review": "Privacy Review", "status": "APPROVED"}'::jsonb,
   'Standard data handling. LGTM.'),

  ('00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000303', 3, 'LAUNCHED_WITH_EXCEPTION',
   '00000000-0000-0000-0000-000000000101', 'Alice Chen', '2026-07-26T01:30:00Z', 'status',
   '{"status": "IN_REVIEW"}'::jsonb,
   '{"status": "LAUNCHED_WITH_EXCEPTION", "pending_reviews": ["Security Review"]}'::jsonb,
   'P0 billing outage affecting 15% of checkout traffic.');

-- Reset the display_id sequence to continue from 105
SELECT setval(pg_get_serial_sequence('launches', 'display_id'), 104);
