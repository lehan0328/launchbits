-- ============================================================================
-- Migration: GitHub App Integration
-- Adds GitHub App installation ID to organizations for Check Runs API.
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS github_app_installation_id INTEGER;
