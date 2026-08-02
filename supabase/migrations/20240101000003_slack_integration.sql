-- ============================================================================
-- Migration: Slack Integration
-- Adds encrypted Slack bot token to organizations and a slack_messages table
-- for tracking messages so they can be updated after review actions.
-- ============================================================================

-- Add Slack credentials to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slack_bot_token_encrypted TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slack_team_id VARCHAR(50);

-- Slack message tracking table
CREATE TABLE IF NOT EXISTS slack_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    launch_id       UUID NOT NULL REFERENCES launches(id) ON DELETE CASCADE,
    review_id       UUID REFERENCES launch_reviews(id) ON DELETE SET NULL,
    channel_id      VARCHAR(50) NOT NULL,
    message_ts      VARCHAR(50) NOT NULL,   -- Slack's unique message timestamp identifier
    message_type    VARCHAR(30) NOT NULL,   -- 'review_request', 'approval', 'denial', 'slo_warning'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups when updating messages after review actions
CREATE INDEX IF NOT EXISTS idx_slack_messages_review ON slack_messages(review_id);
CREATE INDEX IF NOT EXISTS idx_slack_messages_launch ON slack_messages(launch_id);

-- RLS policies for slack_messages (scoped to org)
ALTER TABLE slack_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slack_messages_org_read"
    ON slack_messages FOR SELECT
    USING (org_id = public.user_org_id());

CREATE POLICY "slack_messages_org_insert"
    ON slack_messages FOR INSERT
    WITH CHECK (org_id = public.user_org_id());
