// ============================================================================
// SERVER ACTIONS — Mutations for Launch lifecycle
// Next.js Server Actions for all write operations.
// Called from Client Components (LaunchForm) via form actions.
//
// Design: each action authenticates, validates, mutates, logs, and redirects.
// ============================================================================

'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/server/supabase';
import {
  getCurrentUser, createLaunch, updateLaunch, addEvent, addReview,
  getReviewDefinitions, updateReview, updateReviewDefinition,
  getLaunchById, getReviewsForLaunch,
  isSubscribed, subscribeTo, unsubscribeFrom,
} from '@/server/db';
import { calculateRiskLevel } from '@/lib/risk-calculator';
import { evaluateRequiredReviews, DEFAULT_RULES } from '@/lib/rules-engine';
import { canReview, canDowngradeToFyi, canManagePolicies } from '@/lib/permissions';
import { assertValidTransition } from '@/lib/state-machine';
import { isBlockingReview } from '@/lib/utils';
import { notifyReviewRequested, notifyReviewCompleted } from '@/server/slack-notifications';
import { emailReviewRequested, emailReviewCompleted } from '@/server/email-notifications';
import { syncCheckRun } from '@/server/github-checks';
import type { LaunchFormData, ReviewStatus } from '@/lib/types';

// ── Create Launch ───────────────────────────────────────────────────────────

export async function createLaunchAction(formData: LaunchFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  // Calculate risk from questionnaire answers
  const riskLevel = calculateRiskLevel(formData);

  // Create the launch
  const launch = await createLaunch(user.org_id, user.id, formData);
  if (!launch) throw new Error('Failed to create launch');

  // Update with calculated risk level
  await updateLaunch(launch.id, { risk_level: riskLevel });

  revalidatePath('/');
  revalidatePath('/owned');
  redirect(`/launches/${launch.id}`);
}

// ── Save Draft (Create) ─────────────────────────────────────────────────────

export async function saveDraftAction(formData: LaunchFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const riskLevel = calculateRiskLevel(formData);

  const launch = await createLaunch(user.org_id, user.id, formData);
  if (!launch) throw new Error('Failed to create launch');

  await updateLaunch(launch.id, { risk_level: riskLevel });

  revalidatePath('/');
  revalidatePath('/owned');
  redirect(`/launches/${launch.id}`);
}

// ── Update Launch ───────────────────────────────────────────────────────────

export async function updateLaunchAction(launchId: string, formData: LaunchFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const riskLevel = calculateRiskLevel(formData);

  const updated = await updateLaunch(launchId, {
    name: formData.name,
    description: formData.description || null,
    risk_level: riskLevel,
    target_date: formData.target_date || null,
    hard_deadline: formData.hard_deadline,
    q_data_classes: formData.q_data_classes,
    q_target_population: formData.q_target_population,
    q_processing_purpose: formData.q_processing_purpose,
    q_consent_mechanism: formData.q_consent_mechanism,
    q_retention_ttl: formData.q_retention_ttl,
    q_deletion_controls: formData.q_deletion_controls,
    q_external_sharing: formData.q_external_sharing,
    q_ai_model_scope: formData.q_ai_model_scope,
    q_automated_decisions: formData.q_automated_decisions,
    q_network_exposure: formData.q_network_exposure,
    q_auth_secrets: formData.q_auth_secrets,
    q_input_parsing: formData.q_input_parsing,
    github_repo: formData.github_repo || null,
  } as Record<string, unknown>);

  if (!updated) throw new Error('Failed to update launch');

  await addEvent(launchId, updated.version, 'LAUNCH_UPDATED', user.id);

  revalidatePath('/');
  revalidatePath(`/launches/${launchId}`);
  redirect(`/launches/${launchId}`);
}

// ── Submit for Review ───────────────────────────────────────────────────────

export async function submitForReviewAction(launchId: string, formData: LaunchFormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  // Validate the launch exists and the transition is valid
  const currentLaunch = await getLaunchById(launchId);
  if (!currentLaunch) throw new Error('Launch not found');
  assertValidTransition(currentLaunch.status, 'IN_REVIEW');

  const riskLevel = calculateRiskLevel(formData);

  // Update the launch with form data + transition to IN_REVIEW
  const updated = await updateLaunch(launchId, {
    name: formData.name,
    description: formData.description || null,
    status: 'IN_REVIEW',
    risk_level: riskLevel,
    target_date: formData.target_date || null,
    hard_deadline: formData.hard_deadline,
    q_data_classes: formData.q_data_classes,
    q_target_population: formData.q_target_population,
    q_processing_purpose: formData.q_processing_purpose,
    q_consent_mechanism: formData.q_consent_mechanism,
    q_retention_ttl: formData.q_retention_ttl,
    q_deletion_controls: formData.q_deletion_controls,
    q_external_sharing: formData.q_external_sharing,
    q_ai_model_scope: formData.q_ai_model_scope,
    q_automated_decisions: formData.q_automated_decisions,
    q_network_exposure: formData.q_network_exposure,
    q_auth_secrets: formData.q_auth_secrets,
    q_input_parsing: formData.q_input_parsing,
    github_repo: formData.github_repo || null,
  } as Record<string, unknown>);

  if (!updated) throw new Error('Failed to update launch');

  // Evaluate which reviews are required based on rules engine
  const reviewDefs = await getReviewDefinitions(user.org_id);
  const requiredReviews = evaluateRequiredReviews(
    formData,
    riskLevel,
    reviewDefs,
    DEFAULT_RULES
  );

  // Create review records for each required review
  const reviewLabels: string[] = [];
  for (const required of requiredReviews) {
    const isFyi = required.defaultStatus === 'FYI';
    const now = new Date().toISOString();
    const sloDue = isFyi ? null : new Date(
      Date.now() + (required.sloDays * 24 * 60 * 60 * 1000)
    ).toISOString();

    await addReview({
      launch_id: launchId,
      review_definition_id: required.definitionId,
      status: required.defaultStatus,
      slo_started_at: isFyi ? null : now,
      slo_due_at: sloDue,
      trigger_reason: required.triggerReason,
      fyi_allowed: required.fyiAllowed,
      owner_approval_disallowed: required.ownerApprovalDisallowed,
      access_restricted: required.accessRestricted,
    });

    reviewLabels.push(`${required.label}${isFyi ? ' (FYI)' : ''}`);
  }

  // Log the submission event
  await addEvent(launchId, updated.version, 'SUBMITTED_FOR_REVIEW', user.id, {
    new_val: { reviews: reviewLabels },
  });

  // Slack: notify reviewer channels (fire-and-forget)
  const createdReviews = await getReviewsForLaunch(launchId);
  void notifyReviewRequested(user.org_id, updated, createdReviews, user.display_name);

  // Email: notify reviewer emails (fire-and-forget)
  for (const review of createdReviews) {
    if (review.reviewer_emails && review.reviewer_emails.length > 0) {
      void emailReviewRequested(
        user.org_id, updated.name, launchId,
        review.label || "Review",
        review.reviewer_emails, user.display_name,
      );
    }
  }

  // GitHub: create/update check run (fire-and-forget)
  void syncCheckRun(launchId);

  revalidatePath('/');
  revalidatePath('/reviews');
  redirect(`/launches/${launchId}`);
}

// ── Approve Review ──────────────────────────────────────────────────────────

export async function approveReviewAction(reviewId: string, notes: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch the review to check permissions
  const launch = await getLaunchForReview(reviewId);
  if (!launch) throw new Error('Launch not found');

  const reviews = await getReviewsForLaunch(launch.id);
  const review = reviews.find(r => r.id === reviewId);
  if (!review) throw new Error('Review not found');

  // Permission check
  if (!canReview(user, review, [launch.created_by], review.reviewer_emails ?? [])) {
    throw new Error('You do not have permission to approve this review');
  }

  // Update the review
  const updated = await updateReview(reviewId, {
    status: 'APPROVED' as ReviewStatus,
    reviewed_by: user.id,
    reviewed_by_name: user.display_name,
    reviewed_at: new Date().toISOString(),
    notes: notes || null,
  });
  if (!updated) throw new Error('Failed to update review');

  // Log audit event
  await addEvent(launch.id, launch.version, 'REVIEW_APPROVED', user.id, {
    new_val: { review: review.label, notes },
  });

  // Check if all blocking reviews are now approved → auto-transition to APPROVED
  const updatedReviews = await getReviewsForLaunch(launch.id);
  const stillBlocking = updatedReviews.filter(r => isBlockingReview(r.status));
  if (stillBlocking.length === 0 && launch.status === 'IN_REVIEW') {
    await updateLaunch(launch.id, { status: 'APPROVED' });
    await addEvent(launch.id, launch.version, 'LAUNCH_APPROVED', user.id, {
      new_val: { reason: 'All blocking reviews approved' },
    });
  }

  // Slack: notify owner + update channel message (fire-and-forget)
  const ownerData = await getLaunchOwnerEmail(launch.id);
  void notifyReviewCompleted(
    launch.org_id, launch,
    { ...review, label: review.label } as Parameters<typeof notifyReviewCompleted>[2],
    'approved', user.display_name, ownerData || '', notes || null,
  );

  // Email: notify launch owner (fire-and-forget)
  if (ownerData) {
    void emailReviewCompleted(
      launch.org_id, launch.name, launch.id,
      review.label || 'Review',
      'approved', user.display_name, ownerData, notes || null,
    );
  }

  // GitHub: update check run (fire-and-forget)
  void syncCheckRun(launch.id);

  revalidatePath(`/launches/${launch.id}`);
  revalidatePath('/');
  revalidatePath('/reviews');
}

// ── Request Changes ─────────────────────────────────────────────────────────

export async function requestChangesAction(reviewId: string, notes: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!notes || notes.trim().length === 0) {
    throw new Error('Notes are required when requesting changes');
  }

  const launch = await getLaunchForReview(reviewId);
  if (!launch) throw new Error('Launch not found');

  const reviews = await getReviewsForLaunch(launch.id);
  const review = reviews.find(r => r.id === reviewId);
  if (!review) throw new Error('Review not found');

  if (!canReview(user, review, [launch.created_by], review.reviewer_emails ?? [])) {
    throw new Error('You do not have permission to request changes on this review');
  }

  const updated = await updateReview(reviewId, {
    status: 'NEEDS_WORK' as ReviewStatus,
    reviewed_by: user.id,
    reviewed_by_name: user.display_name,
    reviewed_at: new Date().toISOString(),
    notes: notes,
  });
  if (!updated) throw new Error('Failed to update review');

  await addEvent(launch.id, launch.version, 'REVIEW_CHANGES_REQUESTED', user.id, {
    new_val: { review: review.label, notes },
  });

  // Slack: notify owner + update channel message (fire-and-forget)
  const ownerEmail = await getLaunchOwnerEmail(launch.id);
  void notifyReviewCompleted(
    launch.org_id, launch,
    { ...review, label: review.label } as Parameters<typeof notifyReviewCompleted>[2],
    'denied', user.display_name, ownerEmail || '', notes,
  );

  // Email: notify launch owner (fire-and-forget)
  if (ownerEmail) {
    void emailReviewCompleted(
      launch.org_id, launch.name, launch.id,
      review.label || 'Review',
      'denied', user.display_name, ownerEmail, notes,
    );
  }

  // GitHub: update check run (fire-and-forget)
  void syncCheckRun(launch.id);

  revalidatePath(`/launches/${launch.id}`);
  revalidatePath('/');
  revalidatePath('/reviews');
}

// ── Mark as FYI ─────────────────────────────────────────────────────────────

export async function markFyiAction(reviewId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const launch = await getLaunchForReview(reviewId);
  if (!launch) throw new Error('Launch not found');

  const reviews = await getReviewsForLaunch(launch.id);
  const review = reviews.find(r => r.id === reviewId);
  if (!review) throw new Error('Review not found');

  if (!canDowngradeToFyi(user, review, [launch.created_by])) {
    throw new Error('This review cannot be downgraded to FYI');
  }

  const updated = await updateReview(reviewId, {
    status: 'FYI' as ReviewStatus,
    reviewed_by: user.id,
    reviewed_by_name: user.display_name,
    reviewed_at: new Date().toISOString(),
  });
  if (!updated) throw new Error('Failed to update review');

  await addEvent(launch.id, launch.version, 'REVIEW_MARKED_FYI', user.id, {
    new_val: { review: review.label },
  });

  // Re-check if all blocking reviews are now resolved
  const updatedReviews = await getReviewsForLaunch(launch.id);
  const stillBlocking = updatedReviews.filter(r => isBlockingReview(r.status));
  if (stillBlocking.length === 0 && launch.status === 'IN_REVIEW') {
    await updateLaunch(launch.id, { status: 'APPROVED' });
    await addEvent(launch.id, launch.version, 'LAUNCH_APPROVED', user.id, {
      new_val: { reason: 'All blocking reviews resolved' },
    });
  }

  revalidatePath(`/launches/${launch.id}`);
  revalidatePath('/');
  revalidatePath('/reviews');
}

// ── Helper: get launch from review ID ───────────────────────────────────────

async function getLaunchForReview(reviewId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('launch_reviews')
    .select('launch_id')
    .eq('id', reviewId)
    .single();

  if (error || !data) return null;
  return getLaunchById(data.launch_id);
}

async function getLaunchOwnerEmail(launchId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: launch } = await supabase
    .from('launches')
    .select('created_by')
    .eq('id', launchId)
    .single();
  if (!launch) return null;
  const { data: owner } = await supabase
    .from('users')
    .select('email')
    .eq('id', launch.created_by)
    .single();
  return owner?.email || null;
}

// ── Update Reviewer Emails (Admin) ─────────────────────────────────────────

export async function updateReviewerEmailsAction(reviewDefId: string, emails: string[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!canManagePolicies(user)) {
    throw new Error('Only admins can manage reviewer lists');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanedEmails = emails.map(e => e.trim().toLowerCase()).filter(e => e.length > 0);
  for (const email of cleanedEmails) {
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email format: ${email}`);
    }
  }

  const updated = await updateReviewDefinition(reviewDefId, {
    reviewer_emails: cleanedEmails,
  });
  if (!updated) throw new Error('Failed to update reviewer list');

  revalidatePath('/settings');
}

// ── Claim Review (Per-Launch Assignment) ────────────────────────────────────

export async function claimReviewAction(reviewId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const launch = await getLaunchForReview(reviewId);
  if (!launch) throw new Error('Launch not found');

  const reviews = await getReviewsForLaunch(launch.id);
  const review = reviews.find(r => r.id === reviewId);
  if (!review) throw new Error('Review not found');

  // Can only claim pending reviews that haven't been claimed
  if (review.reviewed_by) {
    throw new Error('This review has already been claimed');
  }

  // Check permission (includes reviewer_emails check)
  if (!canReview(user, review, [launch.created_by], review.reviewer_emails ?? [])) {
    throw new Error('You are not authorized to review this');
  }

  const updated = await updateReview(reviewId, {
    reviewed_by: user.id,
    reviewed_by_name: user.display_name,
  });
  if (!updated) throw new Error('Failed to claim review');

  // Log audit event
  await addEvent(launch.id, launch.version, 'REVIEW_CLAIMED', user.id, {
    new_val: { review: review.label, claimed_by: user.display_name },
  });

  revalidatePath(`/launches/${launch.id}`);
  revalidatePath('/');
  revalidatePath('/reviews');
}

// ── Sign Out ────────────────────────────────────────────────────────────────

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// ── Subscriptions ───────────────────────────────────────────────────────────

export async function toggleSubscriptionAction(launchId: string): Promise<{ subscribed: boolean }> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const currentlySubscribed = await isSubscribed(launchId, user.id);

  if (currentlySubscribed) {
    await unsubscribeFrom(launchId, user.id);
  } else {
    await subscribeTo(launchId, user.id, user.org_id);
  }

  revalidatePath(`/launches/${launchId}`);
  revalidatePath('/subscribed');

  return { subscribed: !currentlySubscribed };
}

// ── Launch Lifecycle Actions ────────────────────────────────────────────────

export async function markLaunchedAction(launchId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const launch = await getLaunchById(launchId);
  if (!launch) throw new Error('Launch not found');

  // Validate transition: only APPROVED → LAUNCHED
  assertValidTransition(launch.status, 'LAUNCHED');

  const updated = await updateLaunch(launchId, { status: 'LAUNCHED' });

  await addEvent(launchId, updated?.version ?? launch.version, 'LAUNCH_LAUNCHED', user.id);

  revalidatePath(`/launches/${launchId}`);
  revalidatePath('/');
  revalidatePath('/owned');
}

export async function launchWithExceptionAction(launchId: string, justification: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!justification.trim()) {
    throw new Error('Justification is required for launching with exception');
  }

  const launch = await getLaunchById(launchId);
  if (!launch) throw new Error('Launch not found');

  // Validate transition: only IN_REVIEW → LAUNCHED_WITH_EXCEPTION
  assertValidTransition(launch.status, 'LAUNCHED_WITH_EXCEPTION');

  const updated = await updateLaunch(launchId, { status: 'LAUNCHED_WITH_EXCEPTION' });

  await addEvent(launchId, updated?.version ?? launch.version, 'LAUNCHED_WITH_EXCEPTION', user.id, {
    notes: justification,
  });

  revalidatePath(`/launches/${launchId}`);
  revalidatePath('/');
  revalidatePath('/owned');
}

// ── Disconnect Slack ────────────────────────────────────────────────────────

export async function disconnectSlackAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!canManagePolicies(user)) {
    throw new Error('Only admins can manage integrations');
  }

  const supabase = await createClient();
  await supabase
    .from('organizations')
    .update({ slack_bot_token_encrypted: null, slack_team_id: null })
    .eq('id', user.org_id);

  revalidatePath('/settings');
}

// ── Disconnect GitHub ───────────────────────────────────────────────────────

export async function disconnectGitHubAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!canManagePolicies(user)) {
    throw new Error('Only admins can manage integrations');
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('organizations') as any)
    .update({ github_app_installation_id: null })
    .eq('id', user.org_id);

  revalidatePath('/settings');
}

// ── Connect Email (Resend) ──────────────────────────────────────────────────

export async function connectEmailAction(apiKey: string, fromAddress: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!canManagePolicies(user)) {
    throw new Error('Only admins can manage integrations');
  }

  const { encrypt } = await import('@/server/crypto');
  const encryptedKey = encrypt(apiKey);

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('organizations') as any)
    .update({
      email_resend_api_key_encrypted: encryptedKey,
      email_from_address: fromAddress,
    })
    .eq('id', user.org_id);

  revalidatePath('/settings');
}

// ── Disconnect Email ────────────────────────────────────────────────────────

export async function disconnectEmailAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  if (!canManagePolicies(user)) {
    throw new Error('Only admins can manage integrations');
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('organizations') as any)
    .update({ email_resend_api_key_encrypted: null, email_from_address: null })
    .eq('id', user.org_id);

  revalidatePath('/settings');
}
