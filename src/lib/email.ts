/**
 * Email Client (Resend API)
 *
 * Pure fetch wrapper for the Resend email API — no SDK.
 * Handles sending transactional emails for review lifecycle events.
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

// ============================================================================
// Send Email
// ============================================================================

interface SendEmailParams {
  apiKey: string;
  from: string;
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ id: string } | null> {
  const { apiKey, from, to, subject, html } = params;

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[Email] Failed to send:', res.status, body);
    return null;
  }

  return res.json();
}

// ============================================================================
// Email Templates
// ============================================================================

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.launchbits.dev';

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; background: #f8f9fa; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 10px; border: 1px solid #dadce0; overflow: hidden; }
    .header { background: #4F46E5; padding: 24px 32px; color: #fff; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 600; }
    .body { padding: 24px 32px; color: #202124; line-height: 1.6; }
    .body h2 { font-size: 16px; color: #202124; margin: 0 0 8px; }
    .body p { margin: 0 0 16px; font-size: 14px; color: #5f6368; }
    .meta { background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .meta-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
    .meta-label { color: #80868b; }
    .meta-value { color: #202124; font-weight: 500; }
    .btn { display: inline-block; padding: 10px 24px; background: #4F46E5; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; margin: 8px 0; }
    .btn-secondary { background: #fff; color: #4F46E5; border: 1px solid #dadce0; }
    .status-approved { color: #137333; background: #e6f4ea; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; }
    .status-denied { color: #c5221f; background: #fce8e6; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; }
    .status-warning { color: #b06000; background: #fef7e0; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; }
    .footer { padding: 16px 32px; font-size: 12px; color: #80868b; border-top: 1px solid #e8eaed; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      Sent by <a href="${APP_URL}" style="color: #4F46E5; text-decoration: none;">Launchbits</a> — Launch governance for your team.
    </div>
  </div>
</body>
</html>`;
}

export function buildReviewRequestEmail(params: {
  launchTitle: string;
  launchId: string;
  reviewName: string;
  requesterName: string;
}): { subject: string; html: string } {
  const { launchTitle, launchId, reviewName, requesterName } = params;
  return {
    subject: `[Launchbits] Review requested: ${reviewName} for "${launchTitle}"`,
    html: baseTemplate(`
      <div class="header"><h1>🚀 Review Requested</h1></div>
      <div class="body">
        <h2>${reviewName}</h2>
        <p>${requesterName} has requested your review for <strong>${launchTitle}</strong>.</p>
        <div class="meta">
          <div class="meta-row"><span class="meta-label">Launch</span><span class="meta-value">${launchTitle}</span></div>
          <div class="meta-row"><span class="meta-label">Review</span><span class="meta-value">${reviewName}</span></div>
          <div class="meta-row"><span class="meta-label">Requested by</span><span class="meta-value">${requesterName}</span></div>
        </div>
        <a href="${APP_URL}/launches/${launchId}" class="btn">View Launch</a>
      </div>
    `),
  };
}

export function buildApprovalEmail(params: {
  launchTitle: string;
  launchId: string;
  reviewName: string;
  reviewerName: string;
  notes: string | null;
}): { subject: string; html: string } {
  const { launchTitle, launchId, reviewName, reviewerName, notes } = params;
  return {
    subject: `[Launchbits] ✅ Approved: ${reviewName} for "${launchTitle}"`,
    html: baseTemplate(`
      <div class="header"><h1>✅ Review Approved</h1></div>
      <div class="body">
        <h2>${reviewName} — <span class="status-approved">Approved</span></h2>
        <p><strong>${reviewerName}</strong> approved the ${reviewName} review for <strong>${launchTitle}</strong>.</p>
        ${notes ? `<div class="meta"><div class="meta-row"><span class="meta-label">Notes</span><span class="meta-value">${notes}</span></div></div>` : ''}
        <a href="${APP_URL}/launches/${launchId}" class="btn">View Launch</a>
      </div>
    `),
  };
}

export function buildDenialEmail(params: {
  launchTitle: string;
  launchId: string;
  reviewName: string;
  reviewerName: string;
  notes: string;
}): { subject: string; html: string } {
  const { launchTitle, launchId, reviewName, reviewerName, notes } = params;
  return {
    subject: `[Launchbits] ❌ Changes requested: ${reviewName} for "${launchTitle}"`,
    html: baseTemplate(`
      <div class="header" style="background: #c5221f;"><h1>❌ Changes Requested</h1></div>
      <div class="body">
        <h2>${reviewName} — <span class="status-denied">Changes Requested</span></h2>
        <p><strong>${reviewerName}</strong> requested changes on the ${reviewName} review for <strong>${launchTitle}</strong>.</p>
        <div class="meta"><div class="meta-row"><span class="meta-label">Feedback</span><span class="meta-value">${notes}</span></div></div>
        <a href="${APP_URL}/launches/${launchId}" class="btn">View Launch</a>
      </div>
    `),
  };
}

export function buildSloWarningEmail(params: {
  launchTitle: string;
  launchId: string;
  reviewName: string;
  sloDays: number;
  dueAt: string;
}): { subject: string; html: string } {
  const { launchTitle, launchId, reviewName, sloDays, dueAt } = params;
  const dueDate = new Date(dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return {
    subject: `[Launchbits] ⚠️ SLO breached: ${reviewName} for "${launchTitle}"`,
    html: baseTemplate(`
      <div class="header" style="background: #b06000;"><h1>⚠️ SLO Breached</h1></div>
      <div class="body">
        <h2>${reviewName} — <span class="status-warning">SLO Breached</span></h2>
        <p>The ${reviewName} review for <strong>${launchTitle}</strong> has exceeded its ${sloDays}-day SLO. It was due by <strong>${dueDate}</strong>.</p>
        <div class="meta">
          <div class="meta-row"><span class="meta-label">SLO</span><span class="meta-value">${sloDays} days</span></div>
          <div class="meta-row"><span class="meta-label">Due</span><span class="meta-value">${dueDate}</span></div>
        </div>
        <a href="${APP_URL}/launches/${launchId}" class="btn">View Launch</a>
      </div>
    `),
  };
}
