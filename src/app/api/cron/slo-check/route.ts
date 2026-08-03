/**
 * SLO Check Cron Job
 *
 * Runs on a schedule (hourly via Vercel Cron) to detect reviews that have
 * breached their SLO deadline. For each breached review:
 * 1. Marks it as slo_breached = true
 * 2. Sends Slack warning to reviewer channel
 * 3. Sends email warning to reviewer emails
 * 4. Logs an audit event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/server/admin';
import { notifySloWarning } from '@/server/slack-notifications';
import { emailSloWarning } from '@/server/email-notifications';

export async function GET(request: NextRequest) {
  // Verify this is from Vercel Cron (not a random HTTP request)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: 'No admin client' }, { status: 500 });
  }

  // Find reviews that are past due and not yet marked as breached
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: breachedReviews, error } = await (supabase.from('launch_reviews') as any)
    .select('id, launch_id, review_name, slo_due_at, slo_breached, status, reviewer_emails, org_id, label')
    .eq('status', 'PENDING_REVIEW')
    .eq('slo_breached', false)
    .not('slo_due_at', 'is', null)
    .lt('slo_due_at', new Date().toISOString());

  if (error) {
    console.error('[SLO Cron] Query error:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  if (!breachedReviews || breachedReviews.length === 0) {
    return NextResponse.json({ ok: true, breached: 0 });
  }

  let processed = 0;

  for (const review of breachedReviews) {
    try {
      // Mark as breached
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('launch_reviews') as any)
        .update({ slo_breached: true })
        .eq('id', review.id);

      // Get launch details for notifications
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: launch } = await (supabase.from('launches') as any)
        .select('id, name, org_id, version')
        .eq('id', review.launch_id)
        .single();

      if (!launch) continue;

      // Get review definition for SLO days
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: reviewDef } = await (supabase.from('review_definitions') as any)
        .select('slo_days')
        .eq('label', review.label)
        .eq('org_id', launch.org_id)
        .single();

      const sloDays = reviewDef?.slo_days || 0;
      const reviewerEmails = review.reviewer_emails || [];

      // Log audit event
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('launch_events') as any).insert({
        launch_id: launch.id,
        version: launch.version || 1,
        event_type: 'SLO_BREACHED',
        actor_id: null, // system action
        metadata: {
          review: review.review_name || review.label,
          slo_days: sloDays,
          due_at: review.slo_due_at,
        },
      });

      // Slack notification (fire-and-forget)
      void notifySloWarning(
        launch.org_id,
        launch.name,
        launch.id,
        review.review_name || review.label,
      );

      // Email notification (fire-and-forget)
      if (reviewerEmails.length > 0 && review.slo_due_at) {
        void emailSloWarning(
          launch.org_id,
          launch.name,
          launch.id,
          review.review_name || review.label,
          reviewerEmails,
          sloDays,
          review.slo_due_at,
        );
      }

      processed++;
    } catch (err) {
      console.error(`[SLO Cron] Failed to process review ${review.id}:`, err);
    }
  }

  console.log(`[SLO Cron] Processed ${processed}/${breachedReviews.length} breached reviews`);

  return NextResponse.json({
    ok: true,
    breached: breachedReviews.length,
    processed,
  });
}
