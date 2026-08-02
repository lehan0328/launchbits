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
import { getCurrentUser, createLaunch, updateLaunch, addEvent, addReview, getReviewDefinitions } from '@/server/db';
import { calculateRiskLevel } from '@/lib/risk-calculator';
import { evaluateRequiredReviews, DEFAULT_RULES } from '@/lib/rules-engine';
import type { LaunchFormData, RiskLevel } from '@/lib/types';

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

  revalidatePath('/');
  revalidatePath('/reviews');
  redirect(`/launches/${launchId}`);
}

// ── Sign Out ────────────────────────────────────────────────────────────────

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
