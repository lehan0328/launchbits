-- ============================================================================
-- LAUNCHBITS MVP — COMPLETE DATABASE SCHEMA
-- Run this against your Supabase PostgreSQL instance
-- Derived from Google's Ariane/Launch proto definitions
-- ============================================================================

-- ENUMS
CREATE TYPE launch_status AS ENUM (
    'DRAFT',
    'IN_REVIEW',
    'APPROVED',
    'LAUNCHED',
    'LAUNCHED_WITH_EXCEPTION',
    'CANCELLED'
);

CREATE TYPE review_status AS ENUM (
    'NOT_REQUIRED',
    'FYI',
    'PENDING_REVIEW',
    'IN_PROGRESS',
    'NEEDS_WORK',
    'APPROVED',
    'DENIED'
);

CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TYPE review_type AS ENUM (
    'PRIVACY',
    'SECURITY',
    'LEGAL',
    'ENGINEERING_LEAD',
    'CUSTOM'
);

-- ============================================================================
-- CORE TABLES
-- ============================================================================

CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    policy_rules    TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    email           VARCHAR(255) NOT NULL,
    display_name    VARCHAR(255) NOT NULL,
    slack_user_id   VARCHAR(50),
    avatar_url      VARCHAR(500),
    role            VARCHAR(20) NOT NULL DEFAULT 'member'
                    CHECK (role IN ('member', 'reviewer', 'admin')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, email)
);

-- Launch Cards
CREATE TABLE launches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    display_id      SERIAL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    version         INTEGER NOT NULL DEFAULT 1,
    status          launch_status NOT NULL DEFAULT 'DRAFT',
    risk_level      risk_level NOT NULL DEFAULT 'LOW',
    target_date     DATE,
    hard_deadline   BOOLEAN NOT NULL DEFAULT FALSE,

    -- Privacy questionnaire (PDD)
    q_data_classes          TEXT[] DEFAULT '{}',
    q_target_population     TEXT[] DEFAULT '{}',
    q_processing_purpose    TEXT[] DEFAULT '{}',
    q_consent_mechanism     VARCHAR(50),
    q_retention_ttl         VARCHAR(50),
    q_deletion_controls     VARCHAR(50),
    q_external_sharing      TEXT[] DEFAULT '{}',
    q_ai_model_scope        VARCHAR(50),
    q_automated_decisions   BOOLEAN DEFAULT FALSE,

    -- Security questionnaire (SPUR)
    q_network_exposure      TEXT[] DEFAULT '{}',
    q_auth_secrets          TEXT[] DEFAULT '{}',
    q_input_parsing         TEXT[] DEFAULT '{}',

    -- Exception
    launch_justification    TEXT,

    -- Metadata
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- GitHub
    github_repo     VARCHAR(255),
    github_pr_number INTEGER,

    UNIQUE(org_id, display_id)
);

-- Launch Owners
CREATE TABLE launch_owners (
    launch_id       UUID NOT NULL REFERENCES launches(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (launch_id, user_id)
);

-- Review Definitions (templates)
CREATE TABLE review_definitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    label           VARCHAR(255) NOT NULL,
    review_type     review_type NOT NULL,
    description     TEXT,
    reviewer_slack_channel  VARCHAR(100),
    reviewer_emails         TEXT[] DEFAULT '{}',
    slo_days                INTEGER NOT NULL DEFAULT 3,
    slo_business_days_only  BOOLEAN NOT NULL DEFAULT TRUE,
    escalation_slack_channel VARCHAR(100),
    fyi_allowed                 BOOLEAN NOT NULL DEFAULT TRUE,
    owner_approval_disallowed   BOOLEAN NOT NULL DEFAULT FALSE,
    access_restricted           BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(org_id, label)
);

-- Launch Reviews (approval bits)
CREATE TABLE launch_reviews (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    launch_id               UUID NOT NULL REFERENCES launches(id) ON DELETE CASCADE,
    review_definition_id    UUID NOT NULL REFERENCES review_definitions(id),
    status                  review_status NOT NULL DEFAULT 'PENDING_REVIEW',
    notes                   TEXT,
    reviewed_by             UUID REFERENCES users(id),
    reviewed_by_name        VARCHAR(255),
    reviewed_at             TIMESTAMPTZ,
    slo_started_at          TIMESTAMPTZ,
    slo_due_at              TIMESTAMPTZ,
    slo_breached            BOOLEAN NOT NULL DEFAULT FALSE,
    trigger_reason          TEXT,
    fyi_allowed                 BOOLEAN NOT NULL DEFAULT TRUE,
    owner_approval_disallowed   BOOLEAN NOT NULL DEFAULT FALSE,
    access_restricted           BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(launch_id, review_definition_id)
);

-- Immutable Event Log (audit trail)
CREATE TABLE launch_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    launch_id       UUID NOT NULL REFERENCES launches(id),
    launch_version  INTEGER NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    performed_by    UUID REFERENCES users(id),
    performed_by_name VARCHAR(255),
    performed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    field_changed   VARCHAR(100),
    old_value       JSONB,
    new_value       JSONB,
    notes           TEXT
);

-- Linked Artifacts
CREATE TABLE launch_artifacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    launch_id       UUID NOT NULL REFERENCES launches(id) ON DELETE CASCADE,
    artifact_type   VARCHAR(50) NOT NULL,
    reference_id    VARCHAR(255) NOT NULL,
    url             VARCHAR(1024),
    title           VARCHAR(255)
);

-- GitHub Check Runs
CREATE TABLE github_check_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    launch_id       UUID NOT NULL REFERENCES launches(id),
    repo_full_name  VARCHAR(255) NOT NULL,
    pr_number       INTEGER NOT NULL,
    check_run_id    BIGINT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_launches_org_status ON launches(org_id, status);
CREATE INDEX idx_launches_created_by ON launches(created_by);
CREATE INDEX idx_launch_reviews_launch ON launch_reviews(launch_id);
CREATE INDEX idx_launch_reviews_pending ON launch_reviews(status)
    WHERE status IN ('PENDING_REVIEW', 'IN_PROGRESS', 'NEEDS_WORK');
CREATE INDEX idx_launch_reviews_slo ON launch_reviews(slo_due_at)
    WHERE slo_breached = FALSE AND status = 'PENDING_REVIEW';
CREATE INDEX idx_launch_events_launch ON launch_events(launch_id, performed_at);
CREATE INDEX idx_launch_events_type ON launch_events(event_type);
CREATE INDEX idx_github_checks ON github_check_runs(repo_full_name, pr_number);

-- ============================================================================
-- SECURITY: Make event log append-only (no UPDATE or DELETE)
-- ============================================================================

-- RLS policy: events can only be inserted, never updated or deleted
ALTER TABLE launch_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_insert_only ON launch_events
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY events_select ON launch_events
    FOR SELECT TO authenticated
    USING (true);

-- No UPDATE or DELETE policies = effectively immutable
