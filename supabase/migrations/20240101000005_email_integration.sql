-- ============================================================================
-- Migration: Email (Resend) Integration + SLO Enforcement
-- Adds Resend API key (encrypted) and from address to organizations.
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email_resend_api_key_encrypted TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email_from_address VARCHAR(255);
