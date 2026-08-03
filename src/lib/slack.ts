// ============================================================================
// SLACK CLIENT — Pure fetch-based Slack Web API wrapper
// No Slack SDK dependency. Uses native fetch against https://slack.com/api/.
// ============================================================================

// ── Core API ────────────────────────────────────────────────────────────────

interface SlackApiResponse {
  ok: boolean;
  error?: string;
  ts?: string;          // Message timestamp (used as message ID)
  channel?: string;
  user?: { id: string; name: string };
}

async function slackApi(
  method: string,
  token: string,
  body: Record<string, unknown>,
): Promise<SlackApiResponse> {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Slack API ${method} HTTP ${res.status}`);
  }

  const data = await res.json() as SlackApiResponse;
  if (!data.ok) {
    console.error(`Slack API ${method} error:`, data.error);
  }
  return data;
}

// ── Message Operations ──────────────────────────────────────────────────────

export async function postMessage(
  token: string,
  channel: string,
  blocks: SlackBlock[],
  text: string, // Fallback text for notifications
): Promise<{ ts: string; channel: string } | null> {
  const data = await slackApi('chat.postMessage', token, {
    channel,
    blocks,
    text,
  });
  if (data.ok && data.ts && data.channel) {
    return { ts: data.ts, channel: data.channel };
  }
  return null;
}

export async function updateMessage(
  token: string,
  channel: string,
  ts: string,
  blocks: SlackBlock[],
  text: string,
): Promise<boolean> {
  const data = await slackApi('chat.update', token, {
    channel,
    ts,
    blocks,
    text,
  });
  return data.ok;
}

export async function lookupUserByEmail(
  token: string,
  email: string,
): Promise<string | null> {
  const data = await slackApi('users.lookupByEmail', token, { email });
  return data.ok && data.user ? data.user.id : null;
}

// ── Block Kit Types ─────────────────────────────────────────────────────────

export type SlackBlock =
  | SlackSectionBlock
  | SlackActionsBlock
  | SlackDividerBlock
  | SlackContextBlock;

interface SlackSectionBlock {
  type: 'section';
  text: { type: 'mrkdwn'; text: string };
  accessory?: SlackButton;
}

interface SlackActionsBlock {
  type: 'actions';
  elements: SlackButton[];
}

interface SlackDividerBlock {
  type: 'divider';
}

interface SlackContextBlock {
  type: 'context';
  elements: Array<{ type: 'mrkdwn'; text: string }>;
}

interface SlackButton {
  type: 'button';
  text: { type: 'plain_text'; text: string; emoji?: boolean };
  style?: 'primary' | 'danger';
  action_id?: string;
  value?: string;
  url?: string;
}

// ── Block Kit Templates ─────────────────────────────────────────────────────

interface ReviewRequestData {
  launchId: string;
  launchName: string;
  launchDisplayId: number;
  reviewId: string;
  reviewLabel: string;
  reviewType: string;
  ownerName: string;
  riskLevel: string;
  targetDate: string | null;
  appUrl: string;
}

export function buildReviewRequestBlocks(data: ReviewRequestData): SlackBlock[] {
  const launchUrl = `${data.appUrl}/launches/${data.launchId}`;

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🔔 *New Review Request*\n\n*<${launchUrl}|LB-${data.launchDisplayId}: ${data.launchName}>*`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [
          `*Review:* ${data.reviewLabel} (${data.reviewType})`,
          `*Owner:* ${data.ownerName}`,
          `*Risk:* ${data.riskLevel}`,
          data.targetDate ? `*Target Date:* ${data.targetDate}` : null,
        ].filter(Boolean).join('\n'),
      },
    },
    { type: 'divider' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '✅ Approve', emoji: true },
          style: 'primary',
          action_id: 'approve_review',
          value: data.reviewId,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '🔄 Request Changes', emoji: true },
          style: 'danger',
          action_id: 'request_changes',
          value: data.reviewId,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '🔗 View in Launchbits', emoji: true },
          action_id: 'view_launch',
          value: launchUrl,
        },
      ],
    },
  ];
}

interface ReviewCompletedData {
  launchName: string;
  launchDisplayId: number;
  launchId: string;
  reviewLabel: string;
  reviewerName: string;
  action: 'approved' | 'denied';
  notes: string | null;
  appUrl: string;
}

export function buildReviewCompletedBlocks(data: ReviewCompletedData): SlackBlock[] {
  const launchUrl = `${data.appUrl}/launches/${data.launchId}`;
  const emoji = data.action === 'approved' ? '✅' : '🔄';
  const verb = data.action === 'approved' ? 'Approved' : 'Changes Requested';

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *${data.reviewLabel} — ${verb}*\n\n*<${launchUrl}|LB-${data.launchDisplayId}: ${data.launchName}>*\n\nReviewer: ${data.reviewerName}${data.notes ? `\nNotes: _${data.notes}_` : ''}`,
      },
    },
  ];
}

export function buildReviewCompletedUpdateBlocks(data: ReviewCompletedData): SlackBlock[] {
  const launchUrl = `${data.appUrl}/launches/${data.launchId}`;
  const emoji = data.action === 'approved' ? '✅' : '🔄';
  const verb = data.action === 'approved' ? 'Approved' : 'Changes Requested';

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *${data.reviewLabel} — ${verb}*\n\n*<${launchUrl}|LB-${data.launchDisplayId}: ${data.launchName}>*`,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `${verb} by ${data.reviewerName}${data.notes ? ` · _${data.notes}_` : ''} · <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|just now>`,
        },
      ],
    },
  ];
}

interface SloWarningData {
  launchName: string;
  launchDisplayId: number;
  launchId: string;
  reviewLabel: string;
  sloDueDateStr: string;
  appUrl: string;
}

export function buildSloWarningBlocks(data: SloWarningData): SlackBlock[] {
  const launchUrl = `${data.appUrl}/launches/${data.launchId}`;

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `⚠️ *SLO Breach Warning*\n\n*<${launchUrl}|LB-${data.launchDisplayId}: ${data.launchName}>*\n\nThe *${data.reviewLabel}* review is past its SLO due date (${data.sloDueDateStr}).`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '🔗 View in Launchbits', emoji: true },
          action_id: 'view_launch',
          value: launchUrl,
        },
      ],
    },
  ];
}

// ── Request Signature Validation ────────────────────────────────────────────

import crypto from 'crypto';

/**
 * Validate Slack request signature to prevent spoofing.
 * See: https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string,
): boolean {
  // Reject requests older than 5 minutes (replay protection)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature),
  );
}
