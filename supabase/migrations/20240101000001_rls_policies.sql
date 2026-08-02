-- ============================================================================
-- PHASE 2A: ROW LEVEL SECURITY (RLS) POLICIES
-- Run this AFTER schema.sql to enable org-scoped data isolation.
--
-- Design: All data is scoped by org_id. The authenticated user's org is
-- resolved by matching auth.jwt()->>'email' to the users table.
-- This ensures no user can access data from another organization.
-- ============================================================================

-- ── Helper function: get the current user's org_id ──────────────────────────
-- Used by all RLS policies to scope data access.
-- Placed in public schema (auth schema is managed by Supabase).
CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.users
  WHERE email = auth.jwt()->>'email'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- ORGANIZATIONS
-- Users can only see their own organization.
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own org"
  ON organizations FOR SELECT TO authenticated
  USING (id = public.user_org_id());

-- Only admins can update org settings (future: enforce in server actions too)
CREATE POLICY "Admins can update their org"
  ON organizations FOR UPDATE TO authenticated
  USING (id = public.user_org_id())
  WITH CHECK (id = public.user_org_id());

-- ============================================================================
-- USERS
-- Users can see all members in their org. Only admins can insert/update.
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org members"
  ON users FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

-- Allow insert for auto-provisioning (user's own record)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT TO authenticated
  WITH CHECK (email = auth.jwt()->>'email');

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE TO authenticated
  USING (email = auth.jwt()->>'email')
  WITH CHECK (email = auth.jwt()->>'email');

-- ============================================================================
-- LAUNCHES
-- Full CRUD scoped to org. Any org member can create; owners can update.
-- ============================================================================
ALTER TABLE launches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view launches"
  ON launches FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

CREATE POLICY "Org members can create launches"
  ON launches FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());

CREATE POLICY "Org members can update launches"
  ON launches FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id())
  WITH CHECK (org_id = public.user_org_id());

-- Soft delete only (status → CANCELLED), no hard delete policy
-- CREATE POLICY "No delete" ON launches FOR DELETE TO authenticated USING (false);

-- ============================================================================
-- LAUNCH OWNERS
-- Scoped via join to launches.org_id
-- ============================================================================
ALTER TABLE launch_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view launch owners"
  ON launch_owners FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM launches
      WHERE launches.id = launch_owners.launch_id
      AND launches.org_id = public.user_org_id()
    )
  );

CREATE POLICY "Org members can manage launch owners"
  ON launch_owners FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM launches
      WHERE launches.id = launch_owners.launch_id
      AND launches.org_id = public.user_org_id()
    )
  );

CREATE POLICY "Org members can remove launch owners"
  ON launch_owners FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM launches
      WHERE launches.id = launch_owners.launch_id
      AND launches.org_id = public.user_org_id()
    )
  );

-- ============================================================================
-- REVIEW DEFINITIONS
-- Org-level templates. All members can read; admins can manage.
-- ============================================================================
ALTER TABLE review_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view review definitions"
  ON review_definitions FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

CREATE POLICY "Org members can create review definitions"
  ON review_definitions FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());

CREATE POLICY "Org members can update review definitions"
  ON review_definitions FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id())
  WITH CHECK (org_id = public.user_org_id());

-- ============================================================================
-- LAUNCH REVIEWS
-- Scoped via join to launches.org_id
-- ============================================================================
ALTER TABLE launch_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view launch reviews"
  ON launch_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM launches
      WHERE launches.id = launch_reviews.launch_id
      AND launches.org_id = public.user_org_id()
    )
  );

CREATE POLICY "Org members can create launch reviews"
  ON launch_reviews FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM launches
      WHERE launches.id = launch_reviews.launch_id
      AND launches.org_id = public.user_org_id()
    )
  );

CREATE POLICY "Org members can update launch reviews"
  ON launch_reviews FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM launches
      WHERE launches.id = launch_reviews.launch_id
      AND launches.org_id = public.user_org_id()
    )
  );

-- ============================================================================
-- LAUNCH EVENTS
-- Already has basic RLS (append-only). Replace with org-scoped policies.
-- ============================================================================

-- Drop existing permissive policies and replace with org-scoped ones
DROP POLICY IF EXISTS events_insert_only ON launch_events;
DROP POLICY IF EXISTS events_select ON launch_events;

CREATE POLICY "Org members can view launch events"
  ON launch_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM launches
      WHERE launches.id = launch_events.launch_id
      AND launches.org_id = public.user_org_id()
    )
  );

-- Append-only: org members can insert events for their org's launches
CREATE POLICY "Org members can insert launch events"
  ON launch_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM launches
      WHERE launches.id = launch_events.launch_id
      AND launches.org_id = public.user_org_id()
    )
  );

-- No UPDATE or DELETE policies = immutable audit log

-- ============================================================================
-- LAUNCH ARTIFACTS
-- Scoped via join to launches.org_id
-- ============================================================================
ALTER TABLE launch_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view launch artifacts"
  ON launch_artifacts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM launches
      WHERE launches.id = launch_artifacts.launch_id
      AND launches.org_id = public.user_org_id()
    )
  );

CREATE POLICY "Org members can manage launch artifacts"
  ON launch_artifacts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM launches
      WHERE launches.id = launch_artifacts.launch_id
      AND launches.org_id = public.user_org_id()
    )
  );

-- ============================================================================
-- GITHUB CHECK RUNS
-- Scoped via join to launches.org_id
-- ============================================================================
ALTER TABLE github_check_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view check runs"
  ON github_check_runs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM launches
      WHERE launches.id = github_check_runs.launch_id
      AND launches.org_id = public.user_org_id()
    )
  );

CREATE POLICY "Org members can manage check runs"
  ON github_check_runs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM launches
      WHERE launches.id = github_check_runs.launch_id
      AND launches.org_id = public.user_org_id()
    )
  );
