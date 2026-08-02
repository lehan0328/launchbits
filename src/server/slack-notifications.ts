// ============================================================================
// SLACK NOTIFICATIONS — Server-side orchestration
// Reads DB, decrypts token, builds blocks, sends messages, tracks them.
// All functions are fire-and-forget safe (they catch errors and log).
// ============================================================================

import { createAdminClient } from '@/server/admin';
import { decrypt } from '@/server/crypto';
import {
  postMessage,
  updateMessage,
  lookupUserByEmail,
  buildReviewRequestBlocks,
  buildReviewCompletedBlocks,
  buildReviewCompletedUpdateBlocks,
  type SlackBlock,
} from '@/lib/slack';
import type { Launch, LaunchReview } from '@/lib/types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.launchbits.dev';

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getOrgWithToken(orgId: string): Promise<{ token: string } | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  const org = data as Record<string, unknown> | null;
  if (!org?.slack_bot_token_encrypted) return null;

  try {
    const token = decrypt(org.slack_bot_token_encrypted as string);
    return { token };
  } catch (err) {
    console.error('Failed to decrypt Slack token for org', orgId, err);
    return null;
  }
}

async function saveSlackMessage(
  orgId: string,
  launchId: string,
  reviewId: string | null,
  channelId: string,
  messageTs: string,
  messageType: string,
) {
  const supabase = createAdminClient();
  if (!supabase) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('slack_messages') as any).insert([{
    org_id: orgId,
    launch_id: launchId,
    review_id: reviewId,
    channel_id: channelId,
    message_ts: messageTs,
    message_type: messageType,
  }]);
}

async function getSlackMessageForReview(reviewId: string) {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from('slack_messages')
    .select('*')
    .eq('review_id', reviewId)
    .eq('message_type', 'review_request')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const msg = data as Record<string, unknown> | null;
  return msg ? { channel_id: msg.channel_id as string, message_ts: msg.message_ts as string } : null;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Post review request messages to reviewer Slack channels.
 * Called after submitForReviewAction().
 */
export async function notifyReviewRequested(
  orgId: string,
  launch: Launch,
  reviews: Array<LaunchReview & { label?: string; review_type?: string; reviewer_slack_channel?: string }>,
  ownerName: string,
) {
  try {
    const orgData = await getOrgWithToken(orgId);
    if (!orgData) return; // Slack not connected

    const { token } = orgData;

    for (const review of reviews) {
      const channel = review.reviewer_slack_channel;
      if (!channel) continue; // No channel configured for this review type

      const blocks = buildReviewRequestBlocks({
        launchId: launch.id,
        launchName: launch.name,
        launchDisplayId: launch.display_id,
        reviewId: review.id,
        reviewLabel: review.label || 'Review',
        reviewType: review.review_type || 'REQUIRED',
        ownerName,
        riskLevel: launch.risk_level,
        targetDate: launch.target_date,
        appUrl: APP_URL,
      });

      const fallback = `New review request: LB-${launch.display_id} ${launch.name}`;
      const result = await postMessage(token, channel, blocks, fallback);

      if (result) {
        await saveSlackMessage(orgId, launch.id, review.id, result.channel, result.ts, 'review_request');
      }
    }
  } catch (err) {
    console.error('Slack notifyReviewRequested error:', err);
  }
}

/**
 * Notify the launch owner and update the channel message after a review action.
 * Called after approveReviewAction() or denyReviewAction().
 */
export async function notifyReviewCompleted(
  orgId: string,
  launch: Launch,
  review: LaunchReview & { label?: string },
  action: 'approved' | 'denied',
  reviewerName: string,
  ownerEmail: string,
  notes: string | null,
) {
  try {
    const orgData = await getOrgWithToken(orgId);
    if (!orgData) return;

    const { token } = orgData;

    const completedData = {
      launchName: launch.name,
      launchDisplayId: launch.display_id,
      launchId: launch.id,
      reviewLabel: review.label || 'Review',
      reviewerName,
      action,
      notes,
      appUrl: APP_URL,
    };

    // 1. DM the launch owner
    const ownerSlackId = await lookupUserByEmail(token, ownerEmail);
    if (ownerSlackId) {
      const dmBlocks = buildReviewCompletedBlocks(completedData);
      const emoji = action === 'approved' ? '✅' : '🔄';
      const verb = action === 'approved' ? 'approved' : 'requested changes on';
      await postMessage(
        token,
        ownerSlackId,
        dmBlocks,
        `${emoji} ${reviewerName} ${verb} ${review.label} for LB-${launch.display_id}`,
      );
    }

    // 2. Update the original review request message in the channel
    const originalMsg = await getSlackMessageForReview(review.id);
    if (originalMsg) {
      const updateBlocks = buildReviewCompletedUpdateBlocks(completedData);
      await updateMessage(
        token,
        originalMsg.channel_id,
        originalMsg.message_ts,
        updateBlocks as SlackBlock[],
        `Review ${action}: LB-${launch.display_id}`,
      );
    }
  } catch (err) {
    console.error('Slack notifyReviewCompleted error:', err);
  }
}
