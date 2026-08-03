/**
 * Email Notification Orchestration
 *
 * Server-side functions that coordinate between the database and Resend API
 * to send email notifications for review lifecycle events.
 * Mirrors slack-notifications.ts in structure.
 */

import { createAdminClient } from '@/server/admin';
import { decrypt } from '@/server/crypto';
import {
  sendEmail,
  buildReviewRequestEmail,
  buildApprovalEmail,
  buildDenialEmail,
  buildSloWarningEmail,
} from '@/lib/email';

// ============================================================================
// Public API
// ============================================================================

/**
 * Send review request emails to all reviewer emails for a review.
 * Fire-and-forget safe — catches all errors internally.
 */
export async function emailReviewRequested(
  orgId: string,
  launchTitle: string,
  launchId: string,
  reviewName: string,
  reviewerEmails: string[],
  requesterName: string,
): Promise<void> {
  try {
    const emailConfig = await getEmailConfig(orgId);
    if (!emailConfig) return;

    const { subject, html } = buildReviewRequestEmail({
      launchTitle,
      launchId,
      reviewName,
      requesterName,
    });

    // Send to each reviewer
    for (const to of reviewerEmails) {
      void sendEmail({
        apiKey: emailConfig.apiKey,
        from: emailConfig.from,
        to,
        subject,
        html,
      });
    }

    console.log(`[Email] Review request sent to ${reviewerEmails.length} reviewers for ${reviewName}`);
  } catch (err) {
    console.error('[Email] Failed to send review request:', err);
  }
}

/**
 * Send approval/denial email to the launch owner.
 */
export async function emailReviewCompleted(
  orgId: string,
  launchTitle: string,
  launchId: string,
  reviewName: string,
  action: 'approved' | 'denied',
  reviewerName: string,
  ownerEmail: string,
  notes: string | null,
): Promise<void> {
  try {
    const emailConfig = await getEmailConfig(orgId);
    if (!emailConfig) return;

    const { subject, html } = action === 'approved'
      ? buildApprovalEmail({ launchTitle, launchId, reviewName, reviewerName, notes })
      : buildDenialEmail({ launchTitle, launchId, reviewName, reviewerName, notes: notes || '' });

    await sendEmail({
      apiKey: emailConfig.apiKey,
      from: emailConfig.from,
      to: ownerEmail,
      subject,
      html,
    });

    console.log(`[Email] Review ${action} email sent to ${ownerEmail} for ${reviewName}`);
  } catch (err) {
    console.error('[Email] Failed to send review completion:', err);
  }
}

/**
 * Send SLO warning email to reviewer emails.
 */
export async function emailSloWarning(
  orgId: string,
  launchTitle: string,
  launchId: string,
  reviewName: string,
  reviewerEmails: string[],
  sloDays: number,
  dueAt: string,
): Promise<void> {
  try {
    const emailConfig = await getEmailConfig(orgId);
    if (!emailConfig) return;

    const { subject, html } = buildSloWarningEmail({
      launchTitle,
      launchId,
      reviewName,
      sloDays,
      dueAt,
    });

    for (const to of reviewerEmails) {
      void sendEmail({
        apiKey: emailConfig.apiKey,
        from: emailConfig.from,
        to,
        subject,
        html,
      });
    }

    console.log(`[Email] SLO warning sent to ${reviewerEmails.length} reviewers for ${reviewName}`);
  } catch (err) {
    console.error('[Email] Failed to send SLO warning:', err);
  }
}

// ============================================================================
// Helpers
// ============================================================================

interface EmailConfig {
  apiKey: string;
  from: string;
}

async function getEmailConfig(orgId: string): Promise<EmailConfig | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data: org } = await supabase.from('organizations')
    .select('email_resend_api_key_encrypted, email_from_address')
    .eq('id', orgId)
    .single();

  if (!org?.email_resend_api_key_encrypted || !org?.email_from_address) return null;

  const apiKey = decrypt(org.email_resend_api_key_encrypted);
  return { apiKey, from: org.email_from_address };
}
