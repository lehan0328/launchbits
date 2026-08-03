// ============================================================================
// SLACK INTERACTIVITY — Handles button presses from Slack messages
// Routes: approve_review, request_changes, view_launch
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifySlackSignature } from '@/lib/slack';
import { createAdminClient } from '@/server/admin';
import { notifyReviewCompleted } from '@/server/slack-notifications';
import { rateLimitInteractivity } from '@/lib/rate-limit';
import type { Launch } from '@/lib/types';

interface SlackInteractionPayload {
  type: string;
  user: { id: string; username: string; name: string };
  actions: Array<{
    action_id: string;
    value: string;
  }>;
  trigger_id: string;
}

export async function POST(request: NextRequest) {
  // Rate limit: 60 req/min per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const { allowed, headers } = rateLimitInteractivity(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  const formBody = await request.text();
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret) {
    return NextResponse.json({ error: 'Slack not configured' }, { status: 500 });
  }

  // Verify request signature
  const signature = request.headers.get('x-slack-signature') || '';
  const timestamp = request.headers.get('x-slack-request-timestamp') || '';

  if (!verifySlackSignature(signingSecret, signature, timestamp, formBody)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse the payload (Slack sends form-urlencoded with a "payload" field)
  const params = new URLSearchParams(formBody);
  const payloadStr = params.get('payload');
  if (!payloadStr) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
  }

  const payload = JSON.parse(payloadStr) as SlackInteractionPayload;
  const action = payload.actions?.[0];
  if (!action) {
    return NextResponse.json({ ok: true }); // No action to handle
  }

  // Handle "View in Launchbits" — just acknowledge (URL is in the button)
  if (action.action_id === 'view_launch') {
    return NextResponse.json({ ok: true });
  }

  // Handle approve/deny from Slack
  if (action.action_id === 'approve_review' || action.action_id === 'request_changes') {
    const reviewId = action.value;
    const isApproval = action.action_id === 'approve_review';
    const newStatus = isApproval ? 'APPROVED' : 'DENIED';

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Get the review + launch
    const { data: reviewData } = await supabase
      .from('launch_reviews')
      .select('*, launch:launches(*)')
      .eq('id', reviewId)
      .single();

    const review = reviewData as Record<string, unknown> | null;
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check if already reviewed
    if (review.status !== 'PENDING_REVIEW') {
      return NextResponse.json({
        response_action: 'ephemeral',
        text: `This review has already been ${(review.status as string).toLowerCase()}.`,
      });
    }

    // Look up the Slack user's email to find their Launchbits user
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('slack_user_id', payload.user.id)
      .single();

    const user = userData as Record<string, unknown> | null;
    const reviewerName = (user?.display_name as string) || payload.user.name;
    const reviewerId = (user?.id as string) || null;

    // Update the review
    await supabase.from('launch_reviews')
      .update({
        status: newStatus,
        reviewed_by: reviewerId,
        reviewed_by_name: reviewerName,
        reviewed_at: new Date().toISOString(),
        notes: isApproval ? null : 'Changes requested via Slack',
      })
      .eq('id', reviewId);

    // Log audit event
    const launch = review.launch as Launch;
    await supabase.from('launch_events').insert([{
      launch_id: launch.id,
      launch_version: launch.version,
      event_type: isApproval ? 'REVIEW_APPROVED' : 'REVIEW_DENIED',
      performed_by: reviewerId,
      performed_by_name: reviewerName,
      notes: JSON.stringify({ review_id: reviewId, source: 'slack' }),
    }]);

    // Get review definition label for notification
    const { data: reviewDefData } = await supabase
      .from('review_definitions')
      .select('label')
      .eq('id', review.review_definition_id as string)
      .single();

    const reviewDef = reviewDefData as Record<string, unknown> | null;

    // Get launch owner email for DM notification
    const { data: ownerData } = await supabase
      .from('users')
      .select('email')
      .eq('id', launch.created_by)
      .single();

    const owner = ownerData as Record<string, unknown> | null;

    // Send notifications (fire-and-forget)
    void notifyReviewCompleted(
      launch.org_id,
      launch,
      { ...(review as unknown as Parameters<typeof notifyReviewCompleted>[2]), label: reviewDef?.label as string },
      isApproval ? 'approved' : 'denied',
      reviewerName,
      (owner?.email as string) || '',
      isApproval ? null : 'Changes requested via Slack',
    );

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
