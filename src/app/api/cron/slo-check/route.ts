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
import * as Sentry from '@sentry/nextjs';
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
  // Join review_definitions to get label, slo_days, and reviewer_emails
  const { data: breachedReviews, error } = await supabase.from('launch_reviews')
    .select('id, launch_id, slo_due_at, slo_breached, status, review_definition_id, review_definitions(label, slo_days, reviewer_emails)')
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
      // Extract joined review definition fields
      const reviewDef = review.review_definitions as unknown as { label: string; slo_days: number; reviewer_emails: string[] | null } | null;
      const reviewLabel = reviewDef?.label ?? 'Unknown';
      const sloDays = reviewDef?.slo_days ?? 0;
      const reviewerEmails = reviewDef?.reviewer_emails ?? [];

      // Mark as breached
      await supabase.from('launch_reviews')
        .update({ slo_breached: true })
        .eq('id', review.id);

      // Get launch details for notifications
      const { data: launch } = await supabase.from('launches')
        .select('id, name, org_id, version')
        .eq('id', review.launch_id)
        .single();

      if (!launch) continue;

      // Log audit event
      await supabase.from('launch_events').insert({
        launch_id: launch.id,
        launch_version: launch.version || 1,
        event_type: 'SLO_BREACHED',
        performed_by: null, // system action
        notes: JSON.stringify({
          review: reviewLabel,
          slo_days: sloDays,
          due_at: review.slo_due_at,
        }),
      });

      // Slack notification (fire-and-forget)
      void notifySloWarning(
        launch.org_id,
        launch.name,
        launch.id,
        reviewLabel,
      );

      // Email notification (fire-and-forget)
      if (reviewerEmails.length > 0 && review.slo_due_at) {
        void emailSloWarning(
          launch.org_id,
          launch.name,
          launch.id,
          reviewLabel,
          reviewerEmails,
          sloDays,
          review.slo_due_at,
        );
      }

      processed++;
    } catch (err) {
      Sentry.captureException(err);
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
