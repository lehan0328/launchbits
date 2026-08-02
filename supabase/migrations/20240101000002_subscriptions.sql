-- ============================================================================
-- Launch Subscriptions
-- Allows users to subscribe to launches they want to follow.
-- ============================================================================

CREATE TABLE launch_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id UUID NOT NULL REFERENCES launches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(launch_id, user_id)
);

-- Index for fast lookups by user
CREATE INDEX idx_subscriptions_user ON launch_subscriptions(user_id, org_id);
CREATE INDEX idx_subscriptions_launch ON launch_subscriptions(launch_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE launch_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions within their org
CREATE POLICY "Users can view own subscriptions"
  ON launch_subscriptions FOR SELECT
  USING (org_id = public.user_org_id());

-- Users can insert their own subscriptions
CREATE POLICY "Users can subscribe"
  ON launch_subscriptions FOR INSERT
  WITH CHECK (
    org_id = public.user_org_id()
    AND user_id = (SELECT id FROM users WHERE email = auth.email())
  );

-- Users can delete their own subscriptions
CREATE POLICY "Users can unsubscribe"
  ON launch_subscriptions FOR DELETE
  USING (
    org_id = public.user_org_id()
    AND user_id = (SELECT id FROM users WHERE email = auth.email())
  );
